import axios from "axios"
export type LogType = {
  tv_id: string
  content_id: string
  timestamp_start: string
  timestamp_end: string
  date: string
}
export const logData = async (log: LogType) => {
  try {
    const response = await axios.post(
      "https://script.google.com/macros/s/AKfycbyK63P-WVIqKM1bWNEmkDyPHqdpAiQ1GP4YCNpQZAwwUH-Nt6WFO-IjZxWHP-njxI3Rqw/exec",
      log,
    )

    console.log("===> response: ", response.data)

    return []
  } catch (error) {
    console.error("Error Writingsheeta:", error)
    throw error // Re-throw the error to handle it in the caller
  }
}
