import { type NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"

export async function POST(req: NextRequest) {
  try {
    console.log("Speaker analysis request received")

    const contentType = req.headers.get("content-type") || ""
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Content type must be multipart/form-data" },
        { status: 400 }
      )
    }

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    const analysisType =
      (formData.get("analysisType") as string) || "diarization"
    const minSpeakers = formData.get("minSpeakers") as string | null
    const maxSpeakers = formData.get("maxSpeakers") as string | null

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    console.log(`Performing ${analysisType} analysis on file: ${file.name}`)

    // Prepare form data for pyannote server
    const pyannoteFormData = new FormData()
    pyannoteFormData.append("file", file)

    if (minSpeakers) pyannoteFormData.append("min_speakers", minSpeakers)
    if (maxSpeakers) pyannoteFormData.append("max_speakers", maxSpeakers)

    // Determine the endpoint based on analysis type
    const endpoints = {
      diarization: "diarize",
      vad: "voice-activity-detection",
      segmentation: "speaker-segmentation",
      overlap: "overlapped-speech-detection",
      changes: "speaker-change-detection",
    }

    const endpoint =
      endpoints[analysisType as keyof typeof endpoints] || "diarize"
    const pyannoteUrl = `${
      process.env.NEXT_PUBLIC_PYANNOTE_URL || "http://localhost:8001"
    }/${endpoint}`

    console.log(`Calling pyannote API: ${pyannoteUrl}`)

    const response = await fetch(pyannoteUrl, {
      method: "POST",
      body: pyannoteFormData,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Pyannote API error:", errorText)
      throw new Error(
        `Pyannote API error: ${response.status} ${response.statusText}`
      )
    }

    const result = await response.json()
    console.log("Pyannote analysis completed successfully")

    return NextResponse.json({
      success: true,
      analysisType,
      result,
      fileName: file.name,
    })
  } catch (error) {
    console.error("Error in speaker analysis:", error)
    const message =
      error instanceof Error ? error.message : "Unknown error occurred"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
