"use client"

import { useState } from "react"

export default function CodeFixer() {
  const [code, setCode] = useState("")
  const [output, setOutput] = useState("")

  async function fixCode() {
    const res = await fetch("/api/code-ai", {
      method: "POST",
      body: JSON.stringify({
        action: "fix",
        language: "typescript",
        code
      })
    })

    const data = await res.json()
    setOutput(data.output)
  }

  return (
    <div className="p-4 space-y-4">
      <textarea
        className="border w-full p-2 h-40"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />

      <button
        className="bg-black text-white px-4 py-2"
        onClick={fixCode}
      >
        ????? ?????
      </button>

      <pre className="border p-4 whitespace-pre-wrap">
        {output}
      </pre>
    </div>
  )
}
