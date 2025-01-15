import axios from "axios"

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1msuryPC68YWX3YTKbfb3ASFxmt8w72eywM3HRsbT4uY/gviz/tq?tqx=out:json"

export const fetchSheetData = async (tvID: string) => {
  try {
    // Fetch data from the Google Sheet
    const response = await axios.get(SHEET_URL)

    // The response data is in a special format, so we need to extract the rows
    const jsonResponse = JSON.parse(response.data.substring(47).slice(0, -2))
    const rows = jsonResponse.table.rows

    // Map the rows to extract cell values
    const sheetData = rows.map((row: any) => {
      return row.c.map((cell: any) => (cell ? cell.v : null)) // Handle null cells
    })

    // Log the extracted data
    console.log("Fetched Sheet Data:", sheetData)
    console.log("====> tvuid: ", tvID)
    // Reformat the data
    const formattedData = {
      sheet1: sheetData
        .map((row: any) => ({
          contentId: row[1],
          id: row[0],
          link: row[3],
          title: row[2],
          tvId: row[0],
          type: row[4],
        }))
        .filter((item: any) => item.tvId === Number(tvID)), // Filter based on tvId
    }

    console.log("===> formated data: ", formattedData)

    return formattedData
  } catch (error) {
    console.error("Error fetching sheet data:", error)
    throw error
  }
}
