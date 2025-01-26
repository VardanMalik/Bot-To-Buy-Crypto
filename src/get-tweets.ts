import axios from "axios";

const TWEET_MAX_TIME_MS = 1 * 60 * 1000;  // Only interested in last 60 sec tweets

interface Tweet {
    contents: string;
    id: string;
    createdAt: string;
}


export async function getTweets(userName: string): Promise<Tweet[]> {

    // NodeJs Axios request from Postman
    let config = {      
      method: 'get',
      maxBodyLength: Infinity,
      url: `https://twttrapi.p.rapidapi.com/user-tweets?username=${userName}`,
      headers: { 
        'x-rapidapi-host': 'twttrapi.p.rapidapi.com', 
        'x-rapidapi-key': process.env.RAPID_API_KEY
      }
    };
  
    const response = await axios.request(config)
    // path where tweet is located form Postman
    const timelineResponse = response.data.data.user_result.result.timeline_response.timeline.instructions.filter((x: any) => x.__typename === "TimelineAddEntries");

    const tweets: Tweet[] = [];
    timelineResponse[0].entries.map((x: any) => {
        try {         // Used try catch because pstman api schema was not same for every tweet in case of .tweetReasult and was giving error
            tweets.push({
                contents: x.content.content.tweetResult.result.legacy.full_text ?? x.content.content.tweetResult.result.core.user_result.result.legacy.description,//Tweet
                id: x.content.content.tweetResult.result.core.user_result.result.legacy.id_str,
                createdAt: x.content.content.tweetResult.result.legacy.created_at   // Time only last 1 min
            })
        } catch(e) {

        }
    });
    return tweets.filter(x => new Date(x.createdAt).getTime() > Date.now() - TWEET_MAX_TIME_MS);
}