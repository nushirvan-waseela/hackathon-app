import axios from "axios"
export type LogType = {
  tv_id: string
  content_id: string
  timestamp_start: string
  timestamp_end: string
}
export const logData = async (log: LogType) => {
  try {
    const response = await axios.post(
      "https://script.google.com/macros/s/AKfycbw5LRbvfK9euwM0fHelXCBfUMshCHjylRilRVB_B3rTg78BtNmz_-81vYbp-Krj2WoXlQ/exec",
      log,
    )

    console.log("===> response: ", response.data)

    return []
  } catch (error) {
    console.error("Error Writingsheeta:", error)
    throw error // Re-throw the error to handle it in the caller
  }
}
