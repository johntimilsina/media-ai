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
  Subtitles,
  Maximize,
  Minimize,
  Volume2,
  VolumeX,
} from "lucide-react"
import { WHISPER_LANGUAGES } from "@/lib/languages"
import SpeakerAnalysis from "@/components/speaker-analysis"

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
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [followTranscript, setFollowTranscript] = useState(true)
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState<number | null>(
    null
  )
  const [activeTranscriptTab, setActiveTranscriptTab] = useState("transcript")

  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const mediaContainerRef = useRef<HTMLDivElement>(null)
  const transcriptContainerRef = useRef<HTMLDivElement>(null)
  const translationContainerRef = useRef<HTMLDivElement>(null)

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

  // Media player time update and follow transcript
  useEffect(() => {
    const mediaElement = audioRef.current || videoRef.current
    if (!mediaElement) return

    const handleTimeUpdate = () => {
      setCurrentTime(mediaElement.currentTime)

      if (followTranscript && includeTimecodes) {
        const segments =
          activeTranscriptTab === "transcript"
            ? transcriptSegments
            : translationSegments
        const currentIndex = segments.findIndex(
          (segment) =>
            mediaElement.currentTime >= segment.startSeconds &&
            mediaElement.currentTime <= segment.endSeconds
        )

        if (currentIndex !== -1 && currentIndex !== currentSegmentIndex) {
          setCurrentSegmentIndex(currentIndex)

          // Scroll to the current segment
          const container =
            activeTranscriptTab === "transcript"
              ? transcriptContainerRef.current
              : translationContainerRef.current
          const segmentElement = container?.querySelector(
            `[data-segment-index="${currentIndex}"]`
          )

          if (segmentElement && container) {
            segmentElement.scrollIntoView({
              behavior: "smooth",
              block: "center",
            })
          }
        }
      }
    }

    const handleLoadedMetadata = () => {
      setDuration(mediaElement.duration)
    }

    mediaElement.addEventListener("timeupdate", handleTimeUpdate)
    mediaElement.addEventListener("loadedmetadata", handleLoadedMetadata)

    return () => {
      mediaElement.removeEventListener("timeupdate", handleTimeUpdate)
      mediaElement.removeEventListener("loadedmetadata", handleLoadedMetadata)
    }
  }, [
    followTranscript,
    includeTimecodes,
    transcriptSegments,
    translationSegments,
    currentSegmentIndex,
    activeTranscriptTab,
  ])

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  const toggleFullscreen = () => {
    if (!mediaContainerRef.current) return

    if (!document.fullscreenElement) {
      mediaContainerRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`)
      })
    } else {
      document.exitFullscreen()
    }
  }

  const toggleMute = () => {
    const mediaElement = audioRef.current || videoRef.current
    if (mediaElement) {
      mediaElement.muted = !mediaElement.muted
      setIsMuted(mediaElement.muted)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`
  }

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
    setCurrentSegmentIndex(null)
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
        <TabsList className="grid grid-cols-4 mb-8">
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="processing" disabled={!loading}>
            Processing
          </TabsTrigger>
          <TabsTrigger value="results" disabled={!transcript && !translation}>
            Results
          </TabsTrigger>
          <TabsTrigger value="speaker-analysis" disabled={!file}>
            Speaker Analysis
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
                    <div className="relative" ref={mediaContainerRef}>
                      {file.type.startsWith("audio/") ? (
                        <div className="bg-black rounded-lg p-4 flex flex-col items-center">
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
                        </div>
                      ) : (
                        <video
                          ref={videoRef}
                          controls
                          className="w-full rounded-lg"
                          onPlay={() => setIsPlaying(true)}
                          onPause={() => setIsPlaying(false)}
                        >
                          <source src={fileUrl} type={file.type} />
                          Your browser does not support the video element.
                        </video>
                      )}
                    </div>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Media Player Column */}
            {file && fileUrl && (
              <div className="lg:col-span-1">
                <Card className="h-full">
                  <CardHeader>
                    <CardTitle className="text-lg">Media Player</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div
                      className="relative rounded-lg overflow-hidden bg-black"
                      ref={mediaContainerRef}
                    >
                      {file.type.startsWith("audio/") ? (
                        <div className="p-4 flex flex-col items-center">
                          <div className="w-full aspect-video flex items-center justify-center bg-gradient-to-b from-gray-800 to-gray-900 rounded-lg mb-4">
                            <FileAudio className="h-24 w-24 text-white opacity-50" />
                          </div>
                          <audio
                            ref={audioRef}
                            className="w-full hidden"
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                          >
                            <source src={fileUrl} type={file.type} />
                            Your browser does not support the audio element.
                          </audio>
                        </div>
                      ) : (
                        <video
                          ref={videoRef}
                          className="w-full aspect-video object-contain"
                          onPlay={() => setIsPlaying(true)}
                          onPause={() => setIsPlaying(false)}
                        >
                          <source src={fileUrl} type={file.type} />
                          Your browser does not support the video element.
                        </video>
                      )}

                      {/* Custom media controls */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                        <div className="flex flex-col gap-2">
                          {/* Progress bar */}
                          <div
                            className="w-full bg-gray-600 h-1 rounded-full overflow-hidden cursor-pointer"
                            onClick={(e) => {
                              const rect =
                                e.currentTarget.getBoundingClientRect()
                              const pos = (e.clientX - rect.left) / rect.width
                              const mediaElement =
                                audioRef.current || videoRef.current
                              if (mediaElement) {
                                mediaElement.currentTime = pos * duration
                              }
                            }}
                          >
                            <div
                              className="bg-white h-full"
                              style={{
                                width: `${(currentTime / duration) * 100}%`,
                              }}
                            ></div>
                          </div>

                          {/* Controls */}
                          <div className="flex items-center justify-between text-white">
                            <div className="flex items-center gap-3">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-white hover:bg-white/20"
                                onClick={togglePlayPause}
                              >
                                {isPlaying ? (
                                  <Pause className="h-5 w-5" />
                                ) : (
                                  <Play className="h-5 w-5" />
                                )}
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-white hover:bg-white/20"
                                onClick={toggleMute}
                              >
                                {isMuted ? (
                                  <VolumeX className="h-5 w-5" />
                                ) : (
                                  <Volume2 className="h-5 w-5" />
                                )}
                              </Button>

                              <span className="text-xs">
                                {formatTime(currentTime)} /{" "}
                                {formatTime(duration)}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`h-8 text-xs text-white hover:bg-white/20 ${
                                  followTranscript ? "bg-white/30" : ""
                                }`}
                                onClick={() =>
                                  setFollowTranscript(!followTranscript)
                                }
                              >
                                <Subtitles className="h-4 w-4 mr-1" />
                                {followTranscript ? "Following" : "Follow Text"}
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-white hover:bg-white/20"
                                onClick={toggleFullscreen}
                              >
                                {isFullscreen ? (
                                  <Minimize className="h-5 w-5" />
                                ) : (
                                  <Maximize className="h-5 w-5" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-4">
                      <Badge
                        variant={followTranscript ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => setFollowTranscript(!followTranscript)}
                      >
                        <Subtitles className="h-3 w-3 mr-1" />
                        {followTranscript
                          ? "Auto-Follow On"
                          : "Auto-Follow Off"}
                      </Badge>

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
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Results Column */}
            <div
              className={file && fileUrl ? "lg:col-span-1" : "lg:col-span-2"}
            >
              <Card className="h-full">
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <CardTitle>Transcription Results</CardTitle>
                      <CardDescription>
                        {file && `Results for ${file.name}`}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Tabs
                    defaultValue="transcript"
                    className="w-full"
                    value={activeTranscriptTab}
                    onValueChange={(value) => {
                      setActiveTranscriptTab(value)
                      setCurrentSegmentIndex(null)
                    }}
                  >
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
                        <div
                          ref={transcriptContainerRef}
                          className="space-y-1 max-h-[400px] overflow-y-auto border rounded-md p-4"
                        >
                          {transcriptSegments.map((segment, index) => (
                            <div
                              key={index}
                              data-segment-index={index}
                              className={`flex gap-3 p-2 rounded transition-colors ${
                                currentSegmentIndex === index &&
                                followTranscript
                                  ? "bg-blue-100 border-l-4 border-blue-500"
                                  : "hover:bg-gray-50 border-l-4 border-transparent"
                              }`}
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
                        <div
                          ref={translationContainerRef}
                          className="space-y-1 max-h-[400px] overflow-y-auto border rounded-md p-4"
                        >
                          {translationSegments.map((segment, index) => (
                            <div
                              key={index}
                              data-segment-index={index}
                              className={`flex gap-3 p-2 rounded transition-colors ${
                                currentSegmentIndex === index &&
                                followTranscript
                                  ? "bg-blue-100 border-l-4 border-blue-500"
                                  : "hover:bg-gray-50 border-l-4 border-transparent"
                              }`}
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
        <TabsContent value="speaker-analysis">
          <SpeakerAnalysis file={file} />
        </TabsContent>
      </Tabs>
    </main>
  )
}
