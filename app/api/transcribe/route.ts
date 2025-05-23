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
    const includeTimestamps = formData.get("includeTimestamps") === "true"
    const enableTranslation = formData.get("enableTranslation") === "true"

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    console.log(
      `File received: ${file.name}, size: ${file.size}, type: ${file.type}`
    )
    console.log(
      `Options: sourceLanguage=${sourceLanguage}, includeTimestamps=${includeTimestamps}, enableTranslation=${enableTranslation}`
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

    // Build the whisper command with options
    let whisperCmd = `${
      process.env.NEXT_PUBLIC_WHISPER_PATH || "whisper"
    } "${filePath}" --output_dir "${outputDir}"`

    // Add language option if not auto
    if (sourceLanguage !== "auto") {
      whisperCmd += ` --language ${sourceLanguage}`
    }

    // Add task option (transcribe or translate)
    whisperCmd += enableTranslation ? " --task translate" : " --task transcribe"

    // Add timestamp option
    if (includeTimestamps) {
      whisperCmd += " --verbose False"
    }

    console.log(`Executing command: ${whisperCmd}`)
    const { stdout, stderr } = await execAsync(whisperCmd)

    console.log("Whisper stdout:", stdout)
    if (stderr) console.error("Whisper stderr:", stderr)

    // Find and read the transcript files
    const files = readdirSync(outputDir)
    console.log("Files in output directory:", files)

    // Get the transcript
    let transcript = ""
    let translation = ""
    let detectedLanguage = null

    // Read the transcript file
    const txtFile = files.find((f) => f.endsWith(".txt"))
    if (txtFile) {
      const transcriptPath = path.join(outputDir, txtFile)
      const content = readFileSync(transcriptPath, "utf-8")

      if (enableTranslation) {
        translation = content
      } else {
        transcript = content
      }
    }

    // Read the VTT file for timestamps if requested
    if (includeTimestamps) {
      const vttFile = files.find((f) => f.endsWith(".vtt"))
      if (vttFile) {
        const vttPath = path.join(outputDir, vttFile)
        const content = readFileSync(vttPath, "utf-8")

        if (enableTranslation) {
          translation = content
        } else {
          transcript = content
        }
      }
    }

    // Try to extract detected language from stdout
    const langMatch = stdout.match(/Detected language: ([a-z]+)/)
    if (langMatch && langMatch[1]) {
      detectedLanguage = langMatch[1]
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
