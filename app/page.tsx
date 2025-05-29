"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Loader2,
  Upload,
  FileAudio,
  FileVideo,
  X,
  Copy,
  Download,
  Info,
  Clock,
  Languages,
  Edit,
  Play,
  Pause,
} from "lucide-react"
import { WHISPER_LANGUAGES } from "@/lib/languages"

interface TimecodeSegment {
  start: string
  end: string
  text: string
  startSeconds: number
  endSeconds: number
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [transcript, setTranscript] = useState("")
  const [translation, setTranslation] = useState("")
  const [editableTranscript, setEditableTranscript] = useState("")
  const [editableTranslation, setEditableTranslation] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [activeTab, setActiveTab] = useState("upload")
  const [sourceLanguage, setSourceLanguage] = useState("auto")
  const [targetLanguage, setTargetLanguage] = useState("auto")
  const [includeTimecodes, setIncludeTimecodes] = useState(true)
  const [processingTime, setProcessingTime] = useState<number | null>(null)
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null)
  const [transcriptSegments, setTranscriptSegments] = useState<
    TimecodeSegment[]
  >([])
  const [translationSegments, setTranslationSegments] = useState<
    TimecodeSegment[]
  >([])
  const [isPlaying, setIsPlaying] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Update editable content when transcript/translation changes
  useEffect(() => {
    setEditableTranscript(transcript)
    if (includeTimecodes && transcript) {
      setTranscriptSegments(parseVTT(transcript))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript, includeTimecodes])

  useEffect(() => {
    setEditableTranslation(translation)
    if (includeTimecodes && translation) {
      setTranslationSegments(parseVTT(translation))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translation, includeTimecodes])

  // Simulate progress when loading
  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 95) {
            clearInterval(interval)
            return prev
          }
          return prev + 1
        })
      }, 1000)
      return () => clearInterval(interval)
    } else {
      setProgress(0)
    }
  }, [loading])

  const parseVTT = (vttContent: string): TimecodeSegment[] => {
    const segments: TimecodeSegment[] = []
    const lines = vttContent.split("\n")

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line.includes("-->")) {
        const [start, end] = line.split(" --> ")
        const textLines = []
        let j = i + 1
        while (
          j < lines.length &&
          lines[j].trim() !== "" &&
          !lines[j].includes("-->")
        ) {
          textLines.push(lines[j].trim())
          j++
        }
        if (textLines.length > 0) {
          segments.push({
            start,
            end,
            text: textLines.join(" "),
            startSeconds: timeToSeconds(start),
            endSeconds: timeToSeconds(end),
          })
        }
      }
    }
    return segments
  }

  const timeToSeconds = (timeStr: string): number => {
    const parts = timeStr.split(":")
    const seconds = Number.parseFloat(parts[parts.length - 1])
    const minutes = Number.parseInt(parts[parts.length - 2] || "0")
    const hours = Number.parseInt(parts[parts.length - 3] || "0")
    return hours * 3600 + minutes * 60 + seconds
  }

  const seekToTime = (seconds: number) => {
    const mediaElement = audioRef.current || videoRef.current
    if (mediaElement) {
      mediaElement.currentTime = seconds
      if (!isPlaying) {
        mediaElement.play()
        setIsPlaying(true)
      }
    }
  }

  const togglePlayPause = () => {
    const mediaElement = audioRef.current || videoRef.current
    if (mediaElement) {
      if (isPlaying) {
        mediaElement.pause()
        setIsPlaying(false)
      } else {
        mediaElement.play()
        setIsPlaying(true)
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError(null)
      // Create URL for preview
      const url = URL.createObjectURL(selectedFile)
      setFileUrl(url)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file.")
      return
    }

    setLoading(true)
    setError(null)
    setTranscript("")
    setTranslation("")
    setEditableTranscript("")
    setEditableTranslation("")
    setTranscriptSegments([])
    setTranslationSegments([])
    setDetectedLanguage(null)
    setProcessingTime(null)
    setActiveTab("processing")

    const startTime = Date.now()

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("sourceLanguage", sourceLanguage)
      formData.append("targetLanguage", targetLanguage)
      formData.append("includeTimecodes", includeTimecodes.toString())

      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to transcribe file")
      }

      const data = await res.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setTranscript(data.transcript || "No transcript returned.")

      if (data.translation) {
        setTranslation(data.translation)
      }

      if (data.detectedLanguage) {
        setDetectedLanguage(data.detectedLanguage)
      }

      const endTime = Date.now()
      setProcessingTime((endTime - startTime) / 1000)

      setActiveTab("results")
    } catch (err) {
      console.error("Transcription error:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
      setActiveTab("upload")
    } finally {
      setLoading(false)
      setProgress(100)
    }
  }

  const clearFile = () => {
    setFile(null)
    setFileUrl(null)
    setTranscript("")
    setTranslation("")
    setEditableTranscript("")
    setEditableTranslation("")
    setTranscriptSegments([])
    setTranslationSegments([])
    setError(null)
    setDetectedLanguage(null)
    setProcessingTime(null)
    setIsPlaying(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const copyToClipboard = (
    text: string,
    type: "transcript" | "translation"
  ) => {
    navigator.clipboard.writeText(text)
    alert(
      `${
        type === "transcript" ? "Transcript" : "Translation"
      } copied to clipboard!`
    )
  }

  const downloadText = (text: string, type: "transcript" | "translation") => {
    const element = document.createElement("a")
    const fileBlob = new Blob([text], { type: "text/plain" })
    element.href = URL.createObjectURL(fileBlob)
    element.download = `${file?.name || "media"}-${
      type === "transcript" ? "transcript" : "translation"
    }.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const downloadVTT = (text: string, type: "transcript" | "translation") => {
    const element = document.createElement("a")
    const fileBlob = new Blob([text], { type: "text/vtt" })
    element.href = URL.createObjectURL(fileBlob)
    element.download = `${file?.name || "media"}-${
      type === "transcript" ? "transcript" : "translation"
    }.vtt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const downloadSRT = (text: string, type: "transcript" | "translation") => {
    // Convert VTT to SRT format
    let srtContent = text
    if (includeTimecodes && text.includes("-->")) {
      const segments = parseVTT(text)
      srtContent = segments
        .map((segment, index) => {
          const startSRT = segment.start.replace(".", ",")
          const endSRT = segment.end.replace(".", ",")
          return `${index + 1}\n${startSRT} --> ${endSRT}\n${segment.text}\n`
        })
        .join("\n")
    }

    const element = document.createElement("a")
    const fileBlob = new Blob([srtContent], { type: "text/srt" })
    element.href = URL.createObjectURL(fileBlob)
    element.download = `${file?.name || "media"}-${
      type === "transcript" ? "transcript" : "translation"
    }.srt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <main className="container mx-auto py-8 px-4">
      <div className="flex flex-col items-center space-y-4 mb-8">
        <h1 className="text-4xl font-bold tracking-tight">Media AI</h1>
        <p className="text-lg text-gray-600 max-w-2xl text-center">
          Transcribe and translate audio/video files with advanced AI processing
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="max-w-6xl mx-auto"
      >
        <TabsList className="grid grid-cols-3 mb-8">
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="processing" disabled={!loading}>
            Processing
          </TabsTrigger>
          <TabsTrigger value="results" disabled={!transcript && !translation}>
            Results
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle>Upload Media File</CardTitle>
              <CardDescription>
                Upload an audio or video file to transcribe and optionally
                translate
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="file-upload">Audio or Video File</Label>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    file
                      ? "border-blue-300 bg-blue-50"
                      : "border-gray-300 hover:border-blue-300 hover:bg-blue-50"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    id="file-upload"
                    ref={fileInputRef}
                    type="file"
                    accept="audio/*,video/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {!file ? (
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Upload className="h-10 w-10 text-gray-400" />
                      <p className="text-sm text-gray-500">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-400">
                        MP3, MP4, WAV, M4A, WEBM, etc.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2">
                      {file.type.startsWith("audio/") ? (
                        <FileAudio className="h-10 w-10 text-blue-500" />
                      ) : (
                        <FileVideo className="h-10 w-10 text-blue-500" />
                      )}
                      <p className="text-sm font-medium text-blue-600">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {file
                          ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
                          : ""}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          clearFile()
                        }}
                      >
                        <X className="h-4 w-4 mr-2" /> Remove File
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {file && fileUrl && (
                <div className="space-y-2">
                  <Label>Preview</Label>
                  <div className="border rounded-lg p-4 bg-gray-50">
                    {file.type.startsWith("audio/") ? (
                      <audio ref={audioRef} controls className="w-full">
                        <source src={fileUrl} type={file.type} />
                        Your browser does not support the audio element.
                      </audio>
                    ) : (
                      <video
                        ref={videoRef}
                        controls
                        className="w-full max-h-64"
                      >
                        <source src={fileUrl} type={file.type} />
                        Your browser does not support the video element.
                      </video>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="source-language">Source Language</Label>
                  <Select
                    value={sourceLanguage}
                    onValueChange={setSourceLanguage}
                  >
                    <SelectTrigger id="source-language">
                      <SelectValue placeholder="Select source language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto-detect</SelectItem>
                      {Object.entries(WHISPER_LANGUAGES).map(([code, name]) => (
                        <SelectItem key={code} value={code}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    Select the language of your audio or choose auto-detect
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="target-language">Target Language</Label>
                  <Select
                    value={targetLanguage}
                    onValueChange={setTargetLanguage}
                  >
                    <SelectTrigger id="target-language">
                      <SelectValue placeholder="Select target language" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">
                        Same as source (transcribe only)
                      </SelectItem>
                      <SelectItem value="en">English</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    {targetLanguage === "auto"
                      ? "Will transcribe in the original language"
                      : "Will translate to English (only language supported for translation)"}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="include-timecodes" className="cursor-pointer">
                  Include Timecodes
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 ml-1 inline text-gray-400" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>
                          Add timestamps to enable clickable timecode navigation
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Switch
                  id="include-timecodes"
                  checked={includeTimecodes}
                  onCheckedChange={setIncludeTimecodes}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button onClick={handleUpload} disabled={!file}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                    Processing...
                  </>
                ) : (
                  <>
                    {targetLanguage === "auto"
                      ? "Transcribe"
                      : "Transcribe & Translate"}
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="processing">
          <Card>
            <CardHeader>
              <CardTitle>Processing Your Media</CardTitle>
              <CardDescription>
                {targetLanguage === "auto"
                  ? "Transcribing your file..."
                  : "Transcribing and translating your file..."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Processing...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>

              <div className="bg-blue-50 p-4 rounded-md text-blue-800 text-sm">
                <p className="flex items-center">
                  <Info className="h-4 w-4 mr-2" />
                  AI is processing your file. This may take a few minutes
                  depending on the file length.
                  {targetLanguage !== "auto" &&
                    " Translation is included in the process."}
                  {includeTimecodes &&
                    " Timecodes will be included for navigation."}
                </p>
              </div>

              {file && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-md">
                  {file.type.startsWith("audio/") ? (
                    <FileAudio className="h-6 w-6 text-gray-500" />
                  ) : (
                    <FileVideo className="h-6 w-6 text-gray-500" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Media Player Column */}
            {file && fileUrl && (
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Media Player</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {file.type.startsWith("audio/") ? (
                      <div className="space-y-4">
                        <audio
                          ref={audioRef}
                          controls
                          className="w-full"
                          onPlay={() => setIsPlaying(true)}
                          onPause={() => setIsPlaying(false)}
                        >
                          <source src={fileUrl} type={file.type} />
                          Your browser does not support the audio element.
                        </audio>
                        <div className="flex items-center justify-center">
                          <Button
                            onClick={togglePlayPause}
                            variant="outline"
                            size="sm"
                          >
                            {isPlaying ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <video
                        ref={videoRef}
                        controls
                        className="w-full"
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                      >
                        <source src={fileUrl} type={file.type} />
                        Your browser does not support the video element.
                      </video>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Results Column */}
            <div
              className={file && fileUrl ? "lg:col-span-2" : "lg:col-span-3"}
            >
              <Card>
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <CardTitle>Results</CardTitle>
                      <CardDescription>
                        {file && `Results for ${file.name}`}
                      </CardDescription>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {detectedLanguage && (
                        <Badge
                          variant="outline"
                          className="flex items-center gap-1"
                        >
                          <Languages className="h-3 w-3" />
                          {WHISPER_LANGUAGES[detectedLanguage] ||
                            detectedLanguage}
                        </Badge>
                      )}
                      {processingTime && (
                        <Badge
                          variant="outline"
                          className="flex items-center gap-1"
                        >
                          <Clock className="h-3 w-3" />
                          {processingTime.toFixed(1)}s
                        </Badge>
                      )}
                      {includeTimecodes && (
                        <Badge
                          variant="outline"
                          className="flex items-center gap-1"
                        >
                          <Clock className="h-3 w-3" />
                          Timecodes
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Tabs defaultValue="transcript" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="transcript">Transcript</TabsTrigger>
                      <TabsTrigger value="translation" disabled={!translation}>
                        Translation
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="transcript" className="mt-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium text-gray-500">
                            Transcription
                          </h3>
                          <Edit className="h-4 w-4 text-gray-400" />
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-gray-400" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>You can edit the text before downloading</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              copyToClipboard(editableTranscript, "transcript")
                            }
                          >
                            <Copy className="h-4 w-4 mr-2" /> Copy
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              includeTimecodes
                                ? downloadVTT(editableTranscript, "transcript")
                                : downloadText(editableTranscript, "transcript")
                            }
                          >
                            <Download className="h-4 w-4 mr-2" /> Download{" "}
                            {includeTimecodes ? "VTT" : "TXT"}
                          </Button>
                        </div>
                      </div>

                      {includeTimecodes && transcriptSegments.length > 0 ? (
                        <div className="space-y-2 max-h-[400px] overflow-y-auto border rounded-md p-4">
                          {transcriptSegments.map((segment, index) => (
                            <div
                              key={index}
                              className="flex gap-3 p-2 hover:bg-gray-50 rounded"
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-blue-600 hover:text-blue-800 shrink-0"
                                onClick={() => seekToTime(segment.startSeconds)}
                              >
                                {segment.start}
                              </Button>
                              <div className="flex-1 relative">
                                <textarea
                                  value={segment.text}
                                  onChange={(e) => {
                                    const newSegments = [...transcriptSegments]
                                    newSegments[index].text = e.target.value
                                    setTranscriptSegments(newSegments)

                                    // Update the full editable transcript
                                    const updatedTranscript = newSegments
                                      .map(
                                        (seg) =>
                                          `${seg.start} --> ${seg.end}\n${seg.text}\n`
                                      )
                                      .join("\n")
                                    setEditableTranscript(updatedTranscript)
                                  }}
                                  className="w-full min-h-[60px] text-sm border-0 focus:ring-0 focus:outline-none bg-transparent resize-none"
                                  onFocus={(e) => e.stopPropagation()}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <Textarea
                          value={editableTranscript}
                          onChange={(e) =>
                            setEditableTranscript(e.target.value)
                          }
                          className="min-h-[300px] font-mono text-sm"
                          placeholder="Your transcript will appear here..."
                        />
                      )}

                      <div className="flex justify-end gap-2">
                        {includeTimecodes && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              downloadSRT(editableTranscript, "transcript")
                            }
                          >
                            Download SRT
                          </Button>
                        )}
                      </div>
                    </TabsContent>
                    <TabsContent value="translation" className="mt-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium text-gray-500">
                            Translation (English)
                          </h3>
                          <Edit className="h-4 w-4 text-gray-400" />
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Info className="h-4 w-4 text-gray-400" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  You can edit the translation before
                                  downloading
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              copyToClipboard(
                                editableTranslation,
                                "translation"
                              )
                            }
                          >
                            <Copy className="h-4 w-4 mr-2" /> Copy
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              includeTimecodes
                                ? downloadVTT(
                                    editableTranslation,
                                    "translation"
                                  )
                                : downloadText(
                                    editableTranslation,
                                    "translation"
                                  )
                            }
                          >
                            <Download className="h-4 w-4 mr-2" /> Download{" "}
                            {includeTimecodes ? "VTT" : "TXT"}
                          </Button>
                        </div>
                      </div>

                      {includeTimecodes && translationSegments.length > 0 ? (
                        <div className="space-y-2 max-h-[400px] overflow-y-auto border rounded-md p-4">
                          {translationSegments.map((segment, index) => (
                            <div
                              key={index}
                              className="flex gap-3 p-2 hover:bg-gray-50 rounded"
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs text-blue-600 hover:text-blue-800 shrink-0"
                                onClick={() => seekToTime(segment.startSeconds)}
                              >
                                {segment.start}
                              </Button>
                              <div className="flex-1 relative">
                                <textarea
                                  value={segment.text}
                                  onChange={(e) => {
                                    const newSegments = [...translationSegments]
                                    newSegments[index].text = e.target.value
                                    setTranslationSegments(newSegments)

                                    // Update the full editable translation
                                    const updatedTranslation = newSegments
                                      .map(
                                        (seg) =>
                                          `${seg.start} --> ${seg.end}\n${seg.text}\n`
                                      )
                                      .join("\n")
                                    setEditableTranslation(updatedTranslation)
                                  }}
                                  className="w-full min-h-[60px] text-sm border-0 focus:ring-0 focus:outline-none bg-transparent resize-none"
                                  onFocus={(e) => e.stopPropagation()}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <Textarea
                          value={editableTranslation}
                          onChange={(e) =>
                            setEditableTranslation(e.target.value)
                          }
                          className="min-h-[300px] font-mono text-sm"
                          placeholder="Your translation will appear here..."
                        />
                      )}

                      <div className="flex justify-end gap-2">
                        {includeTimecodes && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              downloadSRT(editableTranslation, "translation")
                            }
                          >
                            Download SRT
                          </Button>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setActiveTab("upload")}
                  >
                    Process Another File
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </main>
  )
}
