"use client"

import type React from "react"

import { useState, useRef } from "react"

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [transcript, setTranscript] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

    try {
      const formData = new FormData()
      formData.append("file", file)

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
    } catch (err) {
      console.error("Transcription error:", err)
      setError(err instanceof Error ? err.message : "An unknown error occurred")
    } finally {
      setLoading(false)
    }
  }

  const clearFile = () => {
    setFile(null)
    setTranscript("")
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">Media AI 🎤</h1>

      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="mb-4">
          <label
            htmlFor="file-upload"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Upload Audio or Video File
          </label>
          <input
            id="file-upload"
            ref={fileInputRef}
            type="file"
            accept="audio/*,video/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100"
          />
        </div>

        {file && (
          <div className="mb-4 p-3 bg-gray-50 rounded-md flex justify-between items-center">
            <div>
              <p className="text-sm font-medium">{file.name}</p>
              <p className="text-xs text-gray-500">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
            <button
              onClick={clearFile}
              className="text-red-500 hover:text-red-700 text-sm"
            >
              Clear
            </button>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-center">
          <button
            onClick={handleUpload}
            disabled={loading || !file}
            className={`px-4 py-2 rounded-md text-white font-medium ${
              loading || !file
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Transcribing..." : "Transcribe"}
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center p-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">
            Processing your file. This may take a few minutes...
          </p>
        </div>
      )}

      {transcript && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Transcript</h2>
          <div className="bg-gray-50 p-4 rounded-md whitespace-pre-wrap text-gray-800 max-h-96 overflow-y-auto">
            {transcript}
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                navigator.clipboard.writeText(transcript)
                alert("Transcript copied to clipboard!")
              }}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Copy to clipboard
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
