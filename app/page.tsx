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
  ImportIcon as Translate,
} from "lucide-react"
import { WHISPER_LANGUAGES } from "@/lib/languages"

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [transcript, setTranscript] = useState("")
  const [translation, setTranslation] = useState("")
  const [loading, setLoading] = useState(false)
  const [translating, setTranslating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [activeTab, setActiveTab] = useState("upload")
  const [sourceLanguage, setSourceLanguage] = useState("auto")
  const [includeTimestamps, setIncludeTimestamps] = useState(true)
  const [enableTranslation, setEnableTranslation] = useState(false)
  const [processingTime, setProcessingTime] = useState<number | null>(null)
  const [detectedLanguage, setDetectedLanguage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError(null)
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
    setDetectedLanguage(null)
    setProcessingTime(null)
    setActiveTab("processing")

    const startTime = Date.now()

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("sourceLanguage", sourceLanguage)
      formData.append("includeTimestamps", includeTimestamps.toString())
      formData.append("enableTranslation", enableTranslation.toString())

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

  const handleTranslate = async () => {
    if (!transcript) {
      setError("No transcript available to translate.")
      return
    }

    setTranslating(true)
    setError(null)
    setTranslation("")

    const startTime = Date.now()

    try {
      const formData = new FormData()
      formData.append("transcript", transcript)
      formData.append("sourceLanguage", detectedLanguage || sourceLanguage)
      formData.append("includeTimestamps", includeTimestamps.toString())

      const res = await fetch("/api/translate", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to translate text")
      }

      const data = await res.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setTranslation(data.translation || "No translation returned.")

      const endTime = Date.now()
      const translationTime = (endTime - startTime) / 1000
      console.log(`Translation completed in ${translationTime.toFixed(1)}s`)
    } catch (err) {
      console.error("Translation error:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setTranslating(false)
    }
  }

  const clearFile = () => {
    setFile(null)
    setTranscript("")
    setTranslation("")
    setError(null)
    setDetectedLanguage(null)
    setProcessingTime(null)
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
    const file = new Blob([text], { type: "text/plain" })
    element.href = URL.createObjectURL(file)
    element.download = `${file?.name || "media"}-${
      type === "transcript" ? "transcript" : "translation"
    }.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  const downloadSubtitles = (
    type: "transcript" | "translation",
    format: "srt" | "vtt"
  ) => {
    const text = type === "transcript" ? transcript : translation
    const element = document.createElement("a")
    const file = new Blob([text], { type: "text/plain" })
    element.href = URL.createObjectURL(file)
    element.download = `${file?.name || "media"}-${
      type === "transcript" ? "transcript" : "translation"
    }.${format}`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <main className="container mx-auto py-8 px-4">
      <div className="flex flex-col items-center space-y-4 mb-8">
        <h1 className="text-4xl font-bold tracking-tight">Media AI</h1>
        <p className="text-lg text-gray-600 max-w-2xl text-center">
          Transcribe and translate audio/video files using local Whisper
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="max-w-4xl mx-auto"
      >
        <TabsList className="grid grid-cols-3 mb-8">
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="processing" disabled={!loading}>
            Processing
          </TabsTrigger>
          <TabsTrigger value="results" disabled={!transcript}>
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="source-language">Source Language</Label>
                  <Select
                    value={sourceLanguage}
                    onValueChange={setSourceLanguage}
                  >
                    <SelectTrigger id="source-language">
                      <SelectValue placeholder="Select language" />
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

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="include-timestamps"
                      className="cursor-pointer"
                    >
                      Include Timestamps
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 ml-1 inline text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Add timestamps to the transcription</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <Switch
                      id="include-timestamps"
                      checked={includeTimestamps}
                      onCheckedChange={setIncludeTimestamps}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="enable-translation"
                      className="cursor-pointer"
                    >
                      Translate to English
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-4 w-4 ml-1 inline text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>
                              Translate non-English audio to English during
                              transcription
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <Switch
                      id="enable-translation"
                      checked={enableTranslation}
                      onCheckedChange={setEnableTranslation}
                    />
                  </div>
                </div>
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
                  "Transcribe"
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
                This may take a few minutes depending on the file length
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
                  Whisper is processing your file. This can take some time for
                  longer files.
                  {enableTranslation &&
                    " Translation will be included in the process."}
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
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>Transcription Results</CardTitle>
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
                      {WHISPER_LANGUAGES[detectedLanguage] || detectedLanguage}
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
                  <div className="flex justify-between">
                    <h3 className="text-sm font-medium text-gray-500">
                      Transcription
                    </h3>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(transcript, "transcript")
                        }
                      >
                        <Copy className="h-4 w-4 mr-2" /> Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadText(transcript, "transcript")}
                      >
                        <Download className="h-4 w-4 mr-2" /> Download
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    value={transcript}
                    readOnly
                    className="min-h-[300px] font-mono text-sm"
                  />
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadSubtitles("transcript", "srt")}
                      >
                        Download SRT
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadSubtitles("transcript", "vtt")}
                      >
                        Download VTT
                      </Button>
                    </div>
                    {!translation && transcript && (
                      <Button
                        onClick={handleTranslate}
                        disabled={translating}
                        className="flex items-center gap-2"
                      >
                        {translating ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Translating...
                          </>
                        ) : (
                          <>
                            <Translate className="h-4 w-4" />
                            Translate to English
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="translation" className="mt-4 space-y-4">
                  <div className="flex justify-between">
                    <h3 className="text-sm font-medium text-gray-500">
                      English Translation
                    </h3>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          copyToClipboard(translation, "translation")
                        }
                      >
                        <Copy className="h-4 w-4 mr-2" /> Copy
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadText(translation, "translation")}
                      >
                        <Download className="h-4 w-4 mr-2" /> Download
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    value={translation}
                    readOnly
                    className="min-h-[300px] font-mono text-sm"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadSubtitles("translation", "srt")}
                    >
                      Download SRT
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadSubtitles("translation", "vtt")}
                    >
                      Download VTT
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setActiveTab("upload")}>
                Transcribe Another File
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  )
}
