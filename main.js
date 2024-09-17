import moment from "moment"
import fs from "fs"

// GET AUTHENTICATION TOKEN
let baseUrl = "https://staging-api-health2023.agileteknik.com/api"
const LOGIN_URL = baseUrl + "/v1/login";
const INSERT_MOOD_URL = baseUrl + "/v2/mood-tracker/moods"
const LIST_MOOD_THIS_MONTH_URL = baseUrl + "/v2/mood-tracker/moods/months/"
const USER_INFO_URL = baseUrl + "/v1/user";

const MAX_REPEAT_CHECK_TOKEN = 3;

let tokenFile = 'dist/token.txt';
let dataFile = 'dist/data.json';

let token = null;

let LoginWithCredential = async () => {
    let response = await fetch(LOGIN_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify({
            email: process.env.EMAIL_NIKOMOOD,
            password: process.env.PASSWORD_NIKOMOOD
        })
    })

    if (!response.ok) {
        throw new Error(`Failed to login: ${response.statusText}`);
    }

    let json = await response.json()

    // write token to file
    fs.writeFileSync(tokenFile, json.data.access_token);

    return json.data.access_token
}

let GetToken = async (force = false) => {
    // check if token.txt exists
    if (!fs.existsSync(tokenFile) || force === true) {
        token = await LoginWithCredential();
    } else {
        // read token from file
        token = fs.readFileSync(tokenFile, 'utf-8');
    }
}

let GetListMoodDescriptions = () => {
    // read data.json
    let data = JSON.parse(fs.readFileSync(dataFile, "utf8"));

    return data;
}

let InsertRandomMood = async () => {
    let moodTypes = {
        1: 'Very Happy',
        2: 'Happy',
        3: 'Neutral',
        4: 'Sad',
        5: 'Angry'
    }

    let activities = {
        1: "Belajar",
        2: "Hiburan",
        3: "Kerja",
        4: "Olahraga",
        5: "Sosial",
        6: "Makan",
        7: "Memasak",
        8: "Belanja",
        9: "Tidur",
        10: "Ibadah",
        11: "Meditasi",
    }

    // get random mood & activity
    let randomMoodId = Object.keys(moodTypes)[Math.floor(Math.random() * Object.keys(moodTypes).length)];
    let randomActivityId = Object.keys(activities)[Math.floor(Math.random() * Object.keys(activities).length)];
    let randomMood = moodTypes[randomMoodId];
    let randomActivity = activities[randomActivityId];

    let allData = GetListMoodDescriptions();
    let descriptions = allData[randomMood][randomActivity];

    // get random descriptions
    let description = descriptions[Math.floor(Math.random() * Object.keys(descriptions).length)]

    let today = moment().format("YYYY-MM-DD");

    let response = await fetch(INSERT_MOOD_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": "Bearer " + token
        },
        body: JSON.stringify({
            date: today,
            mood_types_id: randomMoodId,
            activities: [randomActivityId],
            description: description
        })
    })

    if (!response.ok) {
        throw new Error(`Failed to insert mood: ${response.statusText}`);
    }

    console.log("Mood berhasil dimasukkan");
}

let IsFilledToday = async (today) => {
    let response = await fetch(LIST_MOOD_THIS_MONTH_URL + today, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": "Bearer " + token
        }
    })
    if (!response.ok) {
        throw new Error(`Failed to check if filled today: ${response.statusText}`);
    }

    let json = await response.json()

    let isFilledToday = false;

    for (let i = 0; i < json.data.length; i++) {
        if (json.data[i].date === today) {
            isFilledToday = true;
            break;
        }
    }

    if (isFilledToday) {
        return true;
    } else {
        return false;
    }
}

let isTokenValid = async (numberOfRepeat = 1) => {
    let response = await fetch(USER_INFO_URL, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Authorization": "Bearer " + token
        }
    })

    if (!response.ok) {

        if (numberOfRepeat > MAX_REPEAT_CHECK_TOKEN) throw new Error("Failed to check user account");

        await GetToken(true);
        return await isTokenValid(numberOfRepeat + 1);
    }

    let json = await response.json()

    return json.data
}

let main = async () => {
    // Authentication
    await GetToken();

    let dataUser = await isTokenValid();
    console.log("Who i am ? ", dataUser.name);


    // Apakah hari ini sudah isi mood ?
    let today = moment().format('YYYY-MM-DD')
    let isFilledToday = await IsFilledToday(today);
    console.log("Is filled today?", isFilledToday);


    // Jika belum isi, maka insert mood baru
    if (!isFilledToday) {
        await InsertRandomMood();
    }

    console.log('-- Thanks for using this service --');
}

main();
