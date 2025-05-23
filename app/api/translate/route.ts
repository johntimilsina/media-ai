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
    console.log("Translation request received")

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
    const transcript = formData.get("transcript") as string | null
    const sourceLanguage = (formData.get("sourceLanguage") as string) || "auto"
    const includeTimestamps = formData.get("includeTimestamps") === "true"

    if (!transcript) {
      return NextResponse.json(
        { error: "No transcript provided" },
        { status: 400 }
      )
    }

    console.log(
      `Translation request: sourceLanguage=${sourceLanguage}, includeTimestamps=${includeTimestamps}`
    )
    console.log(`Transcript length: ${transcript.length} characters`)

    // Create a unique temporary directory for this request
    const tempDir = path.join(os.tmpdir(), `translate_${randomUUID()}`)
    await mkdir(tempDir, { recursive: true })

    // Create a unique output directory for the translation
    const outputDir = path.join(os.tmpdir(), `translation_${randomUUID()}`)
    await mkdir(outputDir, { recursive: true })

    // Save the transcript to a temporary text file
    const transcriptPath = path.join(tempDir, "transcript.txt")
    await writeFile(transcriptPath, transcript)

    console.log(`Transcript saved to: ${transcriptPath}`)
    console.log(`Output directory: ${outputDir}`)

    // Build the whisper command for translation
    let whisperCmd = `${
      process.env.NEXT_PUBLIC_WHISPER_PATH || "whisper"
    } "${transcriptPath}" --output_dir "${outputDir}"`

    // Add language option if not auto
    if (sourceLanguage !== "auto") {
      whisperCmd += ` --language ${sourceLanguage}`
    }

    // Set task to translate (this translates to English)
    whisperCmd += " --task translate"

    // Add timestamp option
    if (includeTimestamps) {
      whisperCmd += " --verbose False"
    }

    console.log(`Executing translation command: ${whisperCmd}`)
    const { stdout, stderr } = await execAsync(whisperCmd)

    console.log("Whisper translation stdout:", stdout)
    if (stderr) console.error("Whisper translation stderr:", stderr)

    // Find and read the translation files
    const files = readdirSync(outputDir)
    console.log("Files in translation output directory:", files)

    // Get the translation
    let translation = ""

    // Read the translation file
    const txtFile = files.find((f) => f.endsWith(".txt"))
    if (txtFile) {
      const translationPath = path.join(outputDir, txtFile)
      translation = readFileSync(translationPath, "utf-8")
    }

    // Read the VTT file for timestamps if requested
    if (includeTimestamps) {
      const vttFile = files.find((f) => f.endsWith(".vtt"))
      if (vttFile) {
        const vttPath = path.join(outputDir, vttFile)
        translation = readFileSync(vttPath, "utf-8")
      }
    }

    if (!translation) {
      throw new Error("No translation output generated")
    }

    // Return the results
    return NextResponse.json({
      translation,
      success: true,
    })
  } catch (error) {
    console.error("Error in translation process:", error)
    const message =
      error instanceof Error ? error.message : "Unknown error occurred"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
