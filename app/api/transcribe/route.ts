import { type NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { exec } from "child_process"
import { promisify } from "util"
import path from "path"
import { readFileSync, readdirSync } from "fs"
import { randomUUID } from "crypto"
import os from "os"

// Set the runtime to nodejs
export const runtime = "nodejs"

// Convert exec to a promise-based function
const execAsync = promisify(exec)

export async function POST(req: NextRequest) {
  try {
    console.log("Transcription request received")

    // Check if the request is multipart/form-data
    const contentType = req.headers.get("content-type") || ""
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Content type must be multipart/form-data" },
        { status: 400 }
      )
    }

    // Get the form data
    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const sourceLanguage = (formData.get("sourceLanguage") as string) || "auto"
    const targetLanguage = (formData.get("targetLanguage") as string) || "auto"
    const includeTimecodes = formData.get("includeTimecodes") === "true"

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    console.log(
      `File received: ${file.name}, size: ${file.size}, type: ${file.type}`
    )
    console.log(
      `Options: sourceLanguage=${sourceLanguage}, targetLanguage=${targetLanguage}, includeTimecodes=${includeTimecodes}`
    )

    // Create a unique temporary directory for this request
    const tempDir = path.join(os.tmpdir(), `whisper_${randomUUID()}`)
    await mkdir(tempDir, { recursive: true })

    // Create a unique output directory for the transcription
    const outputDir = path.join(os.tmpdir(), `transcript_${randomUUID()}`)
    await mkdir(outputDir, { recursive: true })

    // Save the file to the temporary directory
    const filePath = path.join(tempDir, file.name)
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)

    console.log(`File saved to: ${filePath}`)
    console.log(`Output directory: ${outputDir}`)

    // Determine if we need translation
    const needsTranslation = targetLanguage !== "auto"
    const isTranslatingToEnglish = targetLanguage === "en"

    let transcript = ""
    let translation = ""
    let detectedLanguage = null

    // First, always do transcription to get the original text
    let transcribeCmd = `${
      process.env.NEXT_PUBLIC_WHISPER_PATH || "whisper"
    } "${filePath}" --output_dir "${outputDir}"`

    // Add language option if not auto
    if (sourceLanguage !== "auto") {
      transcribeCmd += ` --language ${sourceLanguage}`
    }

    // Always transcribe first
    transcribeCmd += " --task transcribe"

    // Add output format based on timecode preference
    if (includeTimecodes) {
      transcribeCmd += " --output_format vtt"
    } else {
      transcribeCmd += " --output_format txt"
    }

    console.log(`Executing transcription command: ${transcribeCmd}`)
    const { stdout: transcribeStdout, stderr: transcribeStderr } =
      await execAsync(transcribeCmd)

    console.log("Transcription stdout:", transcribeStdout)
    if (transcribeStderr)
      console.error("Transcription stderr:", transcribeStderr)

    // Read transcription results
    const files = readdirSync(outputDir)
    console.log("Files in transcription output directory:", files)

    // Get the transcript
    if (includeTimecodes) {
      const vttFile = files.find((f) => f.endsWith(".vtt"))
      if (vttFile) {
        const transcriptPath = path.join(outputDir, vttFile)
        transcript = readFileSync(transcriptPath, "utf-8")
      }
    } else {
      const txtFile = files.find((f) => f.endsWith(".txt"))
      if (txtFile) {
        const transcriptPath = path.join(outputDir, txtFile)
        transcript = readFileSync(transcriptPath, "utf-8")
      }
    }

    // Try to extract detected language from stdout
    const langMatch = transcribeStdout.match(/Detected language: ([a-z]+)/)
    if (langMatch && langMatch[1]) {
      detectedLanguage = langMatch[1]
    }

    // If translation is needed and it's to English, use Whisper's translate task
    if (needsTranslation && isTranslatingToEnglish) {
      console.log("Performing translation to English using Whisper")

      // Create a new output directory for translation
      const translationOutputDir = path.join(
        os.tmpdir(),
        `translation_${randomUUID()}`
      )
      await mkdir(translationOutputDir, { recursive: true })

      let translateCmd = `${
        process.env.NEXT_PUBLIC_WHISPER_PATH || "whisper"
      } "${filePath}" --output_dir "${translationOutputDir}"`

      // Add language option if not auto
      if (sourceLanguage !== "auto") {
        translateCmd += ` --language ${sourceLanguage}`
      } else if (detectedLanguage) {
        translateCmd += ` --language ${detectedLanguage}`
      }

      // Use translate task for English translation
      translateCmd += " --task translate"

      // Add output format based on timecode preference
      if (includeTimecodes) {
        translateCmd += " --output_format vtt"
      } else {
        translateCmd += " --output_format txt"
      }

      console.log(`Executing translation command: ${translateCmd}`)
      const { stdout: translateStdout, stderr: translateStderr } =
        await execAsync(translateCmd)

      console.log("Translation stdout:", translateStdout)
      if (translateStderr) console.error("Translation stderr:", translateStderr)

      // Read translation results
      const translationFiles = readdirSync(translationOutputDir)
      console.log("Files in translation output directory:", translationFiles)

      if (includeTimecodes) {
        const translationVttFile = translationFiles.find((f) =>
          f.endsWith(".vtt")
        )
        if (translationVttFile) {
          const translationPath = path.join(
            translationOutputDir,
            translationVttFile
          )
          translation = readFileSync(translationPath, "utf-8")
        }
      } else {
        const translationTxtFile = translationFiles.find((f) =>
          f.endsWith(".txt")
        )
        if (translationTxtFile) {
          const translationPath = path.join(
            translationOutputDir,
            translationTxtFile
          )
          translation = readFileSync(translationPath, "utf-8")
        }
      }
    }

    // Return the results
    return NextResponse.json({
      transcript,
      translation: translation || null,
      detectedLanguage,
      success: true,
      fileName: file.name,
    })
  } catch (error) {
    console.error("Error in transcription process:", error)
    const message =
      error instanceof Error ? error.message : "Unknown error occurred"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// Disable body parsing as we'll handle the multipart form data manually
export const config = {
  api: {
    bodyParser: false,
  },
}
