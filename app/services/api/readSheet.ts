import axios from "axios"

// const SHEET_URL =
//   "https://docs.google.com/spreadsheets/d/1msuryPC68YWX3YTKbfb3ASFxmt8w72eywM3HRsbT4uY/gviz/tq?tqx=out:json"

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1SYtdfMpcWkzci4UFdMBporvJ7Y6je_XXGmvJwduobb8/gviz/tq?tqx=out:json"

export const fetchSheetData = async (tvID: string) => {
  try {
    // Fetch data from the Google Sheet
    const response = await axios.get(SHEET_URL)
    // The response data is in a special format, so we need to extract the rows
    const jsonResponse = JSON.parse(response.data.substring(47).slice(0, -2))
    const rows = jsonResponse.table.rows

    // Map the rows to extract cell values
    const sheetData = rows.map((row: any) => {
      // Each cell in the row is an object with a 'v' property containing the actual value
      return row.c.map((cell: any) => {
        // If cell is null or undefined, return null
        if (!cell) return null
        // Return the actual value from the cell object
        return cell.v
      })
    })

    // Log the extracted data for debugging
    console.log("sheetData: ", sheetData)

    // Reformat the data
    const formattedData = {
      sheet1: sheetData
        .map((row: any[]) => ({
          contentId: row[1],
          id: row[0],
          link: row[4],
          title: row[3],
          tvId: row[2],
          type: row[5].toLowerCase(),
        }))
        .filter((item: any) => String(item.tvId) === String(tvID)), // Filter based on tvId
    }
    console.log("formattedData =====> ", formattedData)

    return formattedData
  } catch (error) {
    console.error("Error fetching sheet data:", error)
    throw error
  }
}
