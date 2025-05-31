"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
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
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Loader2,
  Users,
  Mic,
  Activity,
  GitBranch,
  Shuffle,
  Volume2,
  AlertTriangle,
  CheckCircle,
  Info,
} from "lucide-react"

interface SpeakerAnalysisProps {
  file: File | null
  onAnalysisComplete?: (result: AnalysisResult) => void
}

interface AnalysisResult {
  analysisType: string
  result: unknown
  fileName: string
}

export default function SpeakerAnalysis({
  file,
  onAnalysisComplete,
}: SpeakerAnalysisProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analysisType, setAnalysisType] = useState("diarization")
  const [minSpeakers, setMinSpeakers] = useState("")
  const [maxSpeakers, setMaxSpeakers] = useState("")
  const [results, setResults] = useState<AnalysisResult[]>([])
  const [progress, setProgress] = useState(0)

  const analysisTypes = [
    {
      value: "diarization",
      label: "Speaker Diarization",
      icon: Users,
      description: "Who spoke when",
    },
    {
      value: "vad",
      label: "Voice Activity Detection",
      icon: Mic,
      description: "Detect speech vs silence",
    },
    {
      value: "segmentation",
      label: "Speaker Segmentation",
      icon: Activity,
      description: "Segment audio by speaker",
    },
    {
      value: "overlap",
      label: "Overlapped Speech",
      icon: GitBranch,
      description: "Detect overlapping speech",
    },
    {
      value: "changes",
      label: "Speaker Changes",
      icon: Shuffle,
      description: "Detect speaker transitions",
    },
  ]

  const simulateProgress = () => {
    setProgress(0)
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval)
          return prev
        }
        return prev + 3
      })
    }, 500)
    return interval
  }

  const handleAnalysis = async () => {
    if (!file) {
      setError("Please select a file first")
      return
    }

    setLoading(true)
    setError(null)

    const progressInterval = simulateProgress()

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("analysisType", analysisType)
      if (minSpeakers) formData.append("minSpeakers", minSpeakers)
      if (maxSpeakers) formData.append("maxSpeakers", maxSpeakers)

      const response = await fetch("/api/speaker-analysis", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Analysis failed")
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      setProgress(100)
      const newResult = {
        analysisType: data.analysisType,
        result: data.result,
        fileName: data.fileName,
      }

      setResults((prev) => {
        const filtered = prev.filter(
          (r) => r.analysisType !== data.analysisType
        )
        return [...filtered, newResult]
      })

      if (onAnalysisComplete) {
        onAnalysisComplete(newResult)
      }
    } catch (err) {
      console.error("Analysis error:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      clearInterval(progressInterval)
      setLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`
  }

  interface DiarizationSegment {
    speaker: string
    start: number
    end: number
    duration: number
  }

  interface DiarizationResultType {
    num_speakers: number
    segments: DiarizationSegment[]
    total_duration: number
  }

  const renderDiarizationResult = (result: DiarizationResultType) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {result.num_speakers}
          </div>
          <div className="text-sm text-gray-600">Speakers</div>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {result.segments?.length || 0}
          </div>
          <div className="text-sm text-gray-600">Segments</div>
        </div>
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">
            {formatTime(result.total_duration || 0)}
          </div>
          <div className="text-sm text-gray-600">Duration</div>
        </div>
        <div className="text-center p-3 bg-orange-50 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">
            {result.segments
              ? Math.round(
                  (result.segments.length / (result.total_duration / 60)) * 10
                ) / 10
              : 0}
          </div>
          <div className="text-sm text-gray-600">Turns/min</div>
        </div>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {result.segments?.map((segment: DiarizationSegment, index: number) => (
          <div
            key={index}
            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
          >
            <Badge variant="outline">{segment.speaker}</Badge>
            <span className="text-sm text-gray-600">
              {formatTime(segment.start)}
            </span>
            <span className="text-sm text-gray-400">→</span>
            <span className="text-sm text-gray-600">
              {formatTime(segment.end)}
            </span>
            <span className="text-sm text-gray-500">
              ({formatTime(segment.duration)})
            </span>
          </div>
        ))}
      </div>
    </div>
  )

  interface VADSegment {
    start: number
    end: number
    duration: number
  }

  interface VADResultType {
    total_speech_time: number
    total_duration: number
    speech_ratio: number
    num_speech_segments: number
    speech_segments: VADSegment[]
  }

  const renderVADResult = (result: VADResultType) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {formatTime(result.total_speech_time || 0)}
          </div>
          <div className="text-sm text-gray-600">Speech Time</div>
        </div>
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {formatTime(result.total_duration || 0)}
          </div>
          <div className="text-sm text-gray-600">Total Duration</div>
        </div>
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">
            {Math.round((result.speech_ratio || 0) * 100)}%
          </div>
          <div className="text-sm text-gray-600">Speech Ratio</div>
        </div>
        <div className="text-center p-3 bg-orange-50 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">
            {result.num_speech_segments || 0}
          </div>
          <div className="text-sm text-gray-600">Segments</div>
        </div>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {result.speech_segments?.map((segment: VADSegment, index: number) => (
          <div
            key={index}
            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
          >
            <Volume2 className="h-4 w-4 text-green-500" />
            <span className="text-sm text-gray-600">
              {formatTime(segment.start)}
            </span>
            <span className="text-sm text-gray-400">→</span>
            <span className="text-sm text-gray-600">
              {formatTime(segment.end)}
            </span>
            <span className="text-sm text-gray-500">
              ({formatTime(segment.duration)})
            </span>
          </div>
        ))}
      </div>
    </div>
  )

  interface OverlapSegment {
    speakers: string[]
    start: number
    end: number
    duration: number
  }

  interface OverlapResultType {
    num_overlaps: number
    total_overlap_time: number
    overlaps: OverlapSegment[]
  }

  const renderOverlapResult = (result: OverlapResultType) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="text-center p-3 bg-red-50 rounded-lg">
          <div className="text-2xl font-bold text-red-600">
            {result.num_overlaps || 0}
          </div>
          <div className="text-sm text-gray-600">Overlaps</div>
        </div>
        <div className="text-center p-3 bg-orange-50 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">
            {formatTime(result.total_overlap_time || 0)}
          </div>
          <div className="text-sm text-gray-600">Total Overlap</div>
        </div>
        <div className="text-center p-3 bg-yellow-50 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">
            {result.overlaps?.length > 0
              ? Math.round((result.total_overlap_time / 60) * 10) / 10
              : 0}
          </div>
          <div className="text-sm text-gray-600">Overlaps/min</div>
        </div>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {result.overlaps?.map((overlap: OverlapSegment, index: number) => (
          <div
            key={index}
            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
          >
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <div className="flex gap-2">
              {overlap.speakers.map((speaker: string) => (
                <Badge key={speaker} variant="outline">
                  {speaker}
                </Badge>
              ))}
            </div>
            <span className="text-sm text-gray-600">
              {formatTime(overlap.start)}
            </span>
            <span className="text-sm text-gray-400">→</span>
            <span className="text-sm text-gray-600">
              {formatTime(overlap.end)}
            </span>
            <span className="text-sm text-gray-500">
              ({formatTime(overlap.duration)})
            </span>
          </div>
        ))}
      </div>
    </div>
  )

  interface Change {
    from_speaker: string
    to_speaker: string
    time: number
  }

  interface ChangesResultType {
    num_changes: number
    changes: Change[]
  }

  const renderChangesResult = (result: ChangesResultType) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {result.num_changes || 0}
          </div>
          <div className="text-sm text-gray-600">Speaker Changes</div>
        </div>
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {result.changes?.length > 0
              ? Math.round((result.num_changes / 60) * 10) / 10
              : 0}
          </div>
          <div className="text-sm text-gray-600">Changes/min</div>
        </div>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {result.changes?.map((change: Change, index: number) => (
          <div
            key={index}
            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
          >
            <Shuffle className="h-4 w-4 text-blue-500" />
            <Badge variant="outline">{change.from_speaker}</Badge>
            <span className="text-sm text-gray-400">→</span>
            <Badge variant="outline">{change.to_speaker}</Badge>
            <span className="text-sm text-gray-600">
              at {formatTime(change.time)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )

  interface SegmentationSegment {
    segment_id: number
    start: number
    end: number
    duration: number
  }

  interface SegmentationResultType {
    num_segments: number
    segments: SegmentationSegment[]
  }

  const renderSegmentationResult = (result: SegmentationResultType) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-3 bg-purple-50 rounded-lg">
          <div className="text-2xl font-bold text-purple-600">
            {result.num_segments || 0}
          </div>
          <div className="text-sm text-gray-600">Segments</div>
        </div>
        <div className="text-center p-3 bg-indigo-50 rounded-lg">
          <div className="text-2xl font-bold text-indigo-600">
            {result.segments?.length > 0
              ? Math.round(
                  (result.segments.reduce(
                    (acc: number, seg: SegmentationSegment) =>
                      acc + seg.duration,
                    0
                  ) /
                    result.segments.length) *
                    100
                ) / 100
              : 0}
          </div>
          <div className="text-sm text-gray-600">Avg Duration</div>
        </div>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {result.segments?.map((segment: SegmentationSegment, index: number) => (
          <div
            key={index}
            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
          >
            <Activity className="h-4 w-4 text-purple-500" />
            <span className="text-sm text-gray-600">
              Segment {segment.segment_id}
            </span>
            <span className="text-sm text-gray-600">
              {formatTime(segment.start)}
            </span>
            <span className="text-sm text-gray-400">→</span>
            <span className="text-sm text-gray-600">
              {formatTime(segment.end)}
            </span>
            <span className="text-sm text-gray-500">
              ({formatTime(segment.duration)})
            </span>
          </div>
        ))}
      </div>
    </div>
  )

  const renderResult = (
    result:
      | DiarizationResultType
      | VADResultType
      | OverlapResultType
      | ChangesResultType
      | SegmentationResultType,
    type: string
  ) => {
    switch (type) {
      case "diarization":
        return renderDiarizationResult(result as DiarizationResultType)
      case "vad":
        return renderVADResult(result as VADResultType)
      case "overlap":
        return renderOverlapResult(result as OverlapResultType)
      case "changes":
        return renderChangesResult(result as ChangesResultType)
      case "segmentation":
        return renderSegmentationResult(result as SegmentationResultType)
      default:
        return <div>Unknown analysis type</div>
    }
  }

  const selectedAnalysis = analysisTypes.find(
    (type) => type.value === analysisType
  )

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Speaker Analysis
          </CardTitle>
          <CardDescription>
            Analyze audio for speaker patterns, voice activity, and speech
            characteristics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="analysis-type">Analysis Type</Label>
              <Select value={analysisType} onValueChange={setAnalysisType}>
                <SelectTrigger id="analysis-type">
                  <SelectValue placeholder="Select analysis type" />
                </SelectTrigger>
                <SelectContent>
                  {analysisTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-xs text-gray-500">
                            {type.description}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {analysisType === "diarization" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min-speakers">Min Speakers (optional)</Label>
                  <Input
                    id="min-speakers"
                    type="number"
                    min="1"
                    max="20"
                    value={minSpeakers}
                    onChange={(e) => setMinSpeakers(e.target.value)}
                    placeholder="Auto-detect"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-speakers">Max Speakers (optional)</Label>
                  <Input
                    id="max-speakers"
                    type="number"
                    min="1"
                    max="20"
                    value={maxSpeakers}
                    onChange={(e) => setMaxSpeakers(e.target.value)}
                    placeholder="Auto-detect"
                  />
                </div>
              </div>
            )}

            {selectedAnalysis && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>{selectedAnalysis.label}</AlertTitle>
                <AlertDescription>
                  {selectedAnalysis.description}
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {loading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Analyzing audio...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-gray-500 italic">
                  This may take a few minutes depending on the audio length and
                  analysis type
                </p>
              </div>
            )}
          </div>

          <Button
            onClick={handleAnalysis}
            disabled={!file || loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                {selectedAnalysis && (
                  <selectedAnalysis.icon className="mr-2 h-4 w-4" />
                )}
                Run {selectedAnalysis?.label || "Analysis"}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Analysis Results
            </CardTitle>
            <CardDescription>Results from speaker analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue={results[0]?.analysisType} className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                {analysisTypes.map((type) => {
                  const hasResult = results.some(
                    (r) => r.analysisType === type.value
                  )
                  return (
                    <TabsTrigger
                      key={type.value}
                      value={type.value}
                      disabled={!hasResult}
                    >
                      <type.icon className="h-4 w-4 mr-1" />
                      <span className="hidden sm:inline">
                        {type.label.split(" ")[0]}
                      </span>
                    </TabsTrigger>
                  )
                })}
              </TabsList>

              {results.map((result) => (
                <TabsContent
                  key={result.analysisType}
                  value={result.analysisType}
                  className="mt-4"
                >
                  {renderResult(
                    result.result as
                      | DiarizationResultType
                      | VADResultType
                      | OverlapResultType
                      | ChangesResultType
                      | SegmentationResultType,
                    result.analysisType
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
