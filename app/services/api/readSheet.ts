import axios from "axios"

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1SYtdfMpcWkzci4UFdMBporvJ7Y6je_XXGmvJwduobb8/gviz/tq?tqx=out:json"

export const fetchSheetData = async (_tvID: string) => {
  try {
    // Fetch data from the Google Sheet
    console.log("===> SHEET_URL: ", SHEET_URL)
    const response = await axios.get(SHEET_URL)
    console.log("===> response: ", response)

    // The response data is in a special format, so we need to extract the rows
    const jsonResponse = JSON.parse(response.data.substring(47).slice(0, -2))
    const rows = jsonResponse.table.rows

    // Map the rows to extract cell values
    const sheetData = rows.map((row: any) => {
      return row.c.map((cell: any) => (cell ? cell.v : null)) // Handle null cells
    })

    // Log the extracted data
    console.log("Fetched Sheet Data:", sheetData)
    console.log("====> tvuid: ", _tvID)
    // Reformat the data
    // TODO : data needs to be refined
    const formattedData = {
      sheet1: sheetData
        .map((row: any) => ({
          time: row[0],
          email: row[1],
          tvScreen: row[2],
          title: row[3],
          url: row[4],
          type: row[5],
        }))
        .filter((item: any) => item.tvScreen.toLowerCase() === _tvID.toLowerCase()), // Filter based on tvId
    }

    return formattedData
  } catch (error) {
    console.error("Error fetching sheet data:", error)
    console.log("===> error: ", error)
    throw error
  }
}
