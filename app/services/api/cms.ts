import axios from "axios"

const BASE_URL = "https://api.sheety.co/1fe2b1d108fc6e7da0beb403b19f2ae6/hackathon/sheet1"
const AUTH_TOKEN = "Bearer WaseelaWeLoveYou"

export const fetchCMSData = async (tvID: string) => {
  try {
    // const response = await axios.get(BASE_URL, {
    //   headers: { Authorization: AUTH_TOKEN },
    // })
    const response = {
      sheet1: [
        {
          contentId: 1,
          id: 2,
          link: "https://7a6535793cc9ad5b0f8a7d4c4654f5ea.cdn.bubble.io/f1736766916571x795621532083839600/PXL_20250113_110610966.PORTRAIT.jpg?_gl=1*1dld4b8*_ga*MzYwNzIzOTIwLjE3MDk4ODIzNTI.*_ga_BFPVR2DEE2*MTczNjc2NjI2NC4yMi4xLjE3MzY3NjY3ODkuNTkuMC4w",
          title: "King Saad",
          tvId: 123,
        },
        {
          contentId: 2,
          id: 3,
          link: "https://7a6535793cc9ad5b0f8a7d4c4654f5ea.cdn.bubble.io/f1736766910762x869304951391767700/1000000741.jpg?_gl=1*1dld4b8*_ga*MzYwNzIzOTIwLjE3MDk4ODIzNTI.*_ga_BFPVR2DEE2*MTczNjc2NjI2NC4yMi4xLjE3MzY3NjY3ODkuNTkuMC4w",
          title: "Bhawana Background",
          tvId: 123,
        },
        {
          contentId: 4,
          id: 5,
          link: "https://7a6535793cc9ad5b0f8a7d4c4654f5ea.cdn.bubble.io/f1736840044517x262457008212852350/videoplayback.mp4?_gl=1*1uv6n0v*_gcl_au*MTY1Mjg5NDQ2OC4xNzM2ODM5ODQy*_ga*MzYwNzIzOTIwLjE3MDk4ODIzNTI.*_ga_BFPVR2DEE2*MTczNjgzOTg0MS4yMy4xLjE3MzY4NDAwMzkuNjAuMC4w",
          title: "Cow by Kisaan",
          tvId: 123,
        },
      ],
    }
    console.log("+++++++++++++++++++++++++++++++++++")
    // console.log("unfiltered api rsponse: ", response)
    console.log("+++++++++++++++++++++++++++++++++++")
    // Filter the rows that contain the given tvID
    const filteredData = response.sheet1.filter((item: any) => {
      console.log("Comparing tvId:", typeof item.tvId, "with id:", typeof tvID)
      return item.tvId === Number(tvID)
    })

    //("====> filtered data: ", filteredData)
    // Return only the filtered rows
    // return {
    //   ...response.data,
    //   sheet1: filteredData,
    // }

    return {
      sheet1: [
        {
          contentId: 1,
          id: 2,
          link: "https://7a6535793cc9ad5b0f8a7d4c4654f5ea.cdn.bubble.io/f1736766916571x795621532083839600/PXL_20250113_110610966.PORTRAIT.jpg?_gl=1*1dld4b8*_ga*MzYwNzIzOTIwLjE3MDk4ODIzNTI.*_ga_BFPVR2DEE2*MTczNjc2NjI2NC4yMi4xLjE3MzY3NjY3ODkuNTkuMC4w",
          title: "King Saad",
          tvId: 123,
          type: "image",
        },
        {
          contentId: 2,
          id: 3,
          link: "https://7a6535793cc9ad5b0f8a7d4c4654f5ea.cdn.bubble.io/f1736766910762x869304951391767700/1000000741.jpg?_gl=1*1dld4b8*_ga*MzYwNzIzOTIwLjE3MDk4ODIzNTI.*_ga_BFPVR2DEE2*MTczNjc2NjI2NC4yMi4xLjE3MzY3NjY3ODkuNTkuMC4w",
          title: "Bhawana Background",
          tvId: 123,
          type: "image",
        },
        {
          contentId: 4,
          id: 5,
          link: "https://7a6535793cc9ad5b0f8a7d4c4654f5ea.cdn.bubble.io/f1736840044517x262457008212852350/videoplayback.mp4?_gl=1*1uv6n0v*_gcl_au*MTY1Mjg5NDQ2OC4xNzM2ODM5ODQy*_ga*MzYwNzIzOTIwLjE3MDk4ODIzNTI.*_ga_BFPVR2DEE2*MTczNjgzOTg0MS4yMy4xLjE3MzY4NDAwMzkuNjAuMC4w",
          title: "Cow by Kisaan",
          tvId: 123,
          type: "video",
        },
      ],
    }
  } catch (error) {
    console.error("Error fetching CMS data:", error)
    throw error // Re-throw the error to handle it in the caller
  }
}
