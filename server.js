import axios from "axios";
import dotenv from "dotenv";
import express from "express";
import FormData from 'form-data';
import fs from "fs";
import XLSX from "xlsx";

dotenv.config();

const app = express();
const port = process.env.PORT;
const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;
const GRAPH_API_TOKEN = process.env.GRAPH_API_TOKEN;
app.use(express.json());


const states = {
    START: "start",
    WAIT_FOR_EPIC: "wait_for_epic",
    FINAL_MESSAGE: "final_message",
};

const buttons = {
    FIND_POLLING_BOOTH: "Find Polling Booth",
    VOTERSHELPLINE: "Voter's Helpline",
    PWD: "PWD Helpline",
    FIND_EPIC_ID: "Find my EPIC ID",
    VERIFY_IDENTITY: "Valid ID's To Vote",
    HELPLINE: "Helpline"
};

let conversations = {};
let prvs = Date.now();
let excel_data;

async function getExcelData() {
    const workbook = XLSX.readFile('104.xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(worksheet);
}

async function readMsg(business_phone_number_id, message) {
    await axios({
        method: "POST",
        url: `https://graph.facebook.com/v18.0/${business_phone_number_id}/messages`,
        headers: {
            Authorization: `Bearer ${GRAPH_API_TOKEN}`,
        },
        data: {
            messaging_product: "whatsapp",
            status: "read",
            message_id: message.id,
        },
    });
}

async function sendEpicIdRequest(business_phone_number_id, message) {
    let data = "*Please Enter Your EPIC ID* \n\nYour EPIC ID can be found on your Voter's ID Card \n\nOr Download the *Voters Helpline App* on Google Play Store or App Store to get your e-EPIC ID \n\n*దయచేసి మీ EPIC IDని నమోదు చేయండి* \n\nమీ EPIC IDని మీ ఓటర్ ID కార్డ్‌లో చూడవచ్చు \n\nలేదా మీ e-EPIC IDని పొందడానికి Google Play Store లేదా App Storeలో *ఓటర్స్ హెల్ప్‌లైన్ యాప్*ని డౌన్‌లోడ్ చేసుకోండి\n";
    await sendMsg(business_phone_number_id, message, data, true);

    data = "*Please enter your EPIC ID* \n\n*దయచేసి మీ EPIC IDని నమోదు చేయండి* \n\n";
    await sendMsg(business_phone_number_id, message, data);

    conversations[message.from] = { state: states.WAIT_FOR_EPIC };
}

async function sendEpicIdHelp(business_phone_number_id, message) {
    let data = "Visit Voter's Helpline App to find your EPIC ID, https://play.google.com/store/apps/details?id=com.eci.citizen\n\nమీ EPIC IDని కనుగొనడానికి ఓటర్ హెల్ప్‌లైన్ యాప్‌ని సందర్శించండి, https://play.google.com/store/apps/details?id=com.eci.citizen";
    await sendMsg(business_phone_number_id, message, data, true);
}

async function sendHelpline(business_phone_number_id, message) {
    let data = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: message.from,
        type: "interactive",
        interactive: {
            type: "button",
            body: {
                text: "Choose your helpline",
            },
            footer: {
                text: "Initiative by DEO Hanumakonda | Developed by NITW students",
            },
            action: {
                buttons: [
                    {
                        type: "reply",
                        reply: {
                            id: "1",
                            title: "Voter's Helpline",
                        },
                    },
                    {
                        type: "reply",
                        reply: {
                            id: "2",
                            title: "PWD Helpline",
                        },
                    }
                ],
            },
        }
    }
    await sendMsg(business_phone_number_id, message, data);
}

async function sendPwdHelp(business_phone_number_id, message) {
    let data = "Please join the google meet and wait for the request to be accepted by an operator : https://meet.google.com/gud-dapz-mfo\n\nదయచేసి Google మీట్‌లో చేరండి మరియు ఆపరేటర్ ద్వారా అభ్యర్థన ఆమోదించబడే వరకు వేచి ఉండండి : https://meet.google.com/gud-dapz-mfo";
    await sendMsg(business_phone_number_id, message, data, true);

}

async function sendVoterHelplineHelp(business_phone_number_id, message) {
    let data = "Helpline Number: 1800-425-1816";
    await sendMsg(business_phone_number_id, message, data, true);

}

async function sendIdHelp(business_phone_number_id, message) {

    const dataImage = "https://pbs.twimg.com/media/D2V_WJ6W0AElrYm.jpg"
          
    await sendMsg(business_phone_number_id, message, dataImage,false, true);

}



async function handleButtonMenu(business_phone_number_id, message) {
    switch (message?.interactive?.button_reply?.title) {
        case buttons.PWD:
            try {
                await sendPwdHelp(business_phone_number_id, message);
            } catch (e) {
                console.error(e, "Could Not send sendEpicIdRequest")
                return;
            }
            break;

        case buttons.FIND_EPIC_ID:
            try {
                await sendEpicIdHelp(business_phone_number_id, message);
            } catch (e) {
                console.error(e, "Could Not send sendEpicIdHelp")
                return;
            }
            break;

        case buttons.HELPLINE:
            try {
                await sendHelpline(business_phone_number_id, message);
            } catch (e) {
                console.error(e, "Could Not send sendHelpline")
                return;
            }
            break;

        case buttons.FIND_POLLING_BOOTH:
            try {
                await sendEpicIdRequest(business_phone_number_id, message);
            } catch (e) {
                console.error(e, "Could not sendEpicIdRequest ")
                return;
            }
            break;
        
        case buttons.VERIFY_IDENTITY:
                try {
                    await sendIdHelp(business_phone_number_id, message);
                } catch (e) {
                    console.error(e, "Could not sendEpicIdRequest ")
                    return;
                }
                break;
        case buttons.VOTERSHELPLINE:
                try {
                    await sendVoterHelplineHelp(business_phone_number_id, message);
                } catch (e) {
                    console.error(e, "Could not sendEpicIdRequest ")
                    return;
                }
                break;

        default:
            console.log("No Button Menu");
            break;
    }
}

async function sendMsg(business_phone_number_id, message, data, useContext = false, sendImage = false) {
    if (typeof (data) === "string") {
        if(sendImage == true) {
            data = {
                messaging_product: "whatsapp",
                to: message.from,
                type:"image",
                image: { 
                    link: data
                }
            }
        } else {
            data = {
                messaging_product: "whatsapp",
                to: message.from,
                text: { body: data }
            }
        }
    
        if (useContext)
            data.context = {
                message_id: message.id
            }
    }

    console.log(data)
    const res = await axios({
        method: "POST",
        maxBodyLength: Infinity,
        url: `https://graph.facebook.com/v19.0/${business_phone_number_id}/messages`,
        headers: {
            Authorization: `Bearer ${GRAPH_API_TOKEN}`,
        },
        data: data,
    });
}

async function getCaptcha() {
    const response = await axios.get(
        "https://gateway-voters.eci.gov.in/api/v1/captcha-service/generateCaptcha",
        {
            headers: {
                Accept: "application/json, text/plain, */*",
                "Accept-Language": "en-US,en;q=0.9",
                Connection: "keep-alive",
                Origin: "https://electoralsearch.eci.gov.in",
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "same-site",
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0",
                appName: "ELECTORAL-SEARCH",
                applicationName: "ELECTORAL-SEARCH",
                channelidobo: "ELECTORAL-SEARCH",
                "sec-ch-ua":
                    '"Chromium";v="124", "Microsoft Edge";v="124", "Not-A.Brand";v="99"',
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": '"Windows"',
            },
        }
    );
    return response.data
}

async function saveCaptcha(captcha, word, message) {
    var base64Data = captcha.replace(
        /^data:image\/png;base64,/,
        ""
    );
    await fs.writeFile(`${word}-${message.from}.jpg`, base64Data, "base64", function (err) {
        // console.err(err)
    });

}

async function sleep(ms) {
    return new Promise(resolve => {
        setTimeout(resolve, ms);
    });
}

async function sendCaptcha(business_phone_number_id, message, word) {
    let body = "Please wait for the CAPTCHA to be sent to you shortly. \n\nదయచేసి కొద్దిసేపటిలో మీకు పంపబడే CAPTCHAని పరిష్కరించండి";
    await sendMsg(business_phone_number_id, message, body);

    const captcha = await getCaptcha();
    await saveCaptcha(captcha.captcha, word, message);
    await sleep(200);

    let data = new FormData();
    data.append('messaging_product', 'whatsapp');
    data.append('file', fs.createReadStream(`${word}-${message.from}.jpg`));
    
    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: `https://graph.facebook.com/v18.0/${business_phone_number_id}/media`,
        headers: {
            'Authorization': `Bearer ${GRAPH_API_TOKEN}`,
            ...data.getHeaders()
        },
        data: data
    };

    const res = await axios.request(config)

    data = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: message.from,
        type: "image",
        image: {
            id: res.data.id,
        }
    }

    await sendMsg(business_phone_number_id, message, data);

    conversations[message.from] = {
        state: states.FINAL_MESSAGE,
        epic: word,
        id: captcha.id,
    };


}

async function handleEpic(business_phone_number_id, message) {
    const word = message?.text?.body;
    if (word.includes(" or 1=1 ") || word.length != 10) {
        let data = "Please enter a valid EPIC number.\n\nదయచేసి ఒక చెడ్డ EPIC నంబర్ నమోదు చేయండి.\n";
        await sendMsg(business_phone_number_id, message, data, true);
        delete conversations[message?.from];
        return;
    }

    try {
        await sendCaptcha(business_phone_number_id, message, word);
    } catch (e) {
        await sendMsg(business_phone_number_id, message, "Error Sending Captcha\n");
        console.log(e)
        delete conversations[message?.from];
        return;
    }


}

function capitalizeFirstLetter(str) {
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

async function deleteCaptcha(message) {
    const filePath = `./${conversations[message.from].epic}-${message.from}.jpg`;
    try {
        fs.unlink(filePath, (err) => {
            if (err) {
                console.error('Error deleting file:', err);
                return;
            }
        })
    } catch {
        console.log("Error deleting captcha")
    }
}

async function fetchVoterDetails(business_phone_number_id, message) {

    const data = {
        epicNumber: conversations[message.from].epic,
        captchaId: conversations[message.from].id,
        captchaData: message?.text?.body,
        securityKey: "na",
    };

    const res = await axios.post(
        "https://gateway.eci.gov.in/api/v1/elastic/search-by-epic-from-national-display",
        data,
        {
            headers: {
                Accept: "application/json, text/plain, */*",
                "Accept-Language": "en-US,en;q=0.9",
                Connection: "keep-alive",
                Origin: "https://electoralsearch.eci.gov.in",
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "same-site",
                "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Edg/124.0.0.0",
                appName: "ELECTORAL-SEARCH",
                applicationName: "ELECTORAL-SEARCH",
                channelidobo: "ELECTORAL-SEARCH",
                "sec-ch-ua":
                    '"Chromium";v="124", "Microsoft Edge";v="124", "Not-A.Brand";v="99"',
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": '"Windows"',
            },
        }
    );
    console.log(res.data)
    const loc = res?.data[0]?.content?.partLatLong;
    if (loc != null) {

        let cords;
        if (loc.includes(','))
            cords = loc.split(',');
        else if (loc.includes('-'))
            cords = loc.split('-');
        else
            cords = loc.split(' ')

        const longitude = parseFloat(cords[1]);
        const latitude = parseFloat(cords[0]);


        let data = {
            messaging_product: "whatsapp",
            to: message.from,
            type: "location",
            location: {
                longitude: longitude,
                latitude: latitude,
            },
        }

        await sendMsg(business_phone_number_id, message, data);


    } else {
        let lat, long;
        for (let item of excel_data) {
            if (item.PSBUILDING_NAME_AND_ADDRESS == res.data[0].content?.psbuildingName) {
                lat = item.PS_LAT;
                long = item.PS_LONG
                if (lat != null && long != null) {

                    let data = {
                        messaging_product: "whatsapp",
                        to: message.from,
                        type: "location",
                        location: {
                            longitude: long,
                            latitude: lat,
                        }
                    };
                    await sendMsg(business_phone_number_id, message, data);

                }
                break;
            }
        }
    }

    let body = {
        messaging_product: "whatsapp",
        to: message.from,
        text: {
            body: `Building Name: ${capitalizeFirstLetter(res.data[0].content?.psbuildingName.split(',')[0])}\n\nAddress: ${res.data[0].content?.psbuildingName}\n`,
        }
    };

    await sendMsg(business_phone_number_id, message, body);

    await deleteCaptcha(message);

    delete conversations[message.from];
}

async function handleMsg(business_phone_number_id, message) {
    if (!conversations[message.from]) {
        let data = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: message.from,
            type: "interactive",
            interactive: {
                type: "button",
                body: {
                    text: "We're excited to remind you about the upcoming Elections in Hanumakonda District on *May 13ᵗʰ*. Your vote matters! 🗳\n\nDon't forget to bring your ID and be prepared to make your voice heard!\n\nVisit voterspointhnk.in and show your support to the campaign by clicking amazing selfies with exciting filters and share it online!!\n\nTogether, let's shape the future of our community. Every vote counts!",
                },
                footer: {
                    text: "Initiative by DEO Hanumakonda | Developed by NITW students",
                },
                action: {
                    buttons: [
                        {
                            type: "reply",
                            reply: {
                                id: "1",
                                title: "Helpline",
                            },
                        },
                        {
                            type: "reply",
                            reply: {
                                id: "2",
                                title: "Valid ID's To Vote",
                            },
                        },
                        {
                            type: "reply",
                            reply: {
                                id: "3",
                                title: "Find Polling Booth",
                            },
                        },
                    ],
                },
            }
        }
        
        try {
            await sendMsg(business_phone_number_id, message, data);
            //await sendMsg(business_phone_number_id, message, data2);
            
        } catch (e) {
            return;
        }
    }
    else {
        switch (conversations[message.from].state) {
            case states.WAIT_FOR_EPIC:
                await handleEpic(business_phone_number_id, message);
                break;

            case states.FINAL_MESSAGE:
                try {
                    await fetchVoterDetails(business_phone_number_id, message);
                } catch (e) {
                    await sendMsg(business_phone_number_id, message, "Make sure you enter correct EPIC number and Captcha! \n\nదయచేసి సరైన EPIC నంబర్ మరియు Captcha నమోదు చేయండి!")
                    await sendMsg(business_phone_number_id,message,"Please restart the process again by sending Hi!\n\nదయచేసి హాయ్ అని పంపడం ద్వారా ప్రాసెస్‌ని మళ్లీ రీస్టార్ట్ చేయండి!")
                    deleteCaptcha(message);
                    delete conversations[message.from]
                }

                break;

            default:
                console.log("No state");
                break;
        }
    }

}

app.post("/webhook", async (req, res) => {
    const message = req.body.entry?.[0]?.changes[0]?.value?.messages?.[0];
    const business_phone_number_id = req.body.entry?.[0].changes?.[0].value?.metadata?.phone_number_id;

    if (message) {

        try {
            await readMsg(business_phone_number_id, message);
            res.sendStatus(200);
        } catch (e) {
            res.sendStatus(500);
            return;
        }

        if (prvs / 1000 < message?.timestamp) {
            console.log(message);
            if (message?.type === "text") {
                handleMsg(business_phone_number_id, message);
            }
            else if (Object.values(buttons).includes(message?.interactive?.button_reply?.title)) {
                handleButtonMenu(business_phone_number_id, message);
            }
        }
    }



})

app.get("/webhook", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === WEBHOOK_VERIFY_TOKEN) {
        res.status(200).send(challenge);
        console.log("Webhook verified successfully!");
    } else {
        res.sendStatus(403);
    }
});

app.get("/", (req, res) => {
    res.send(`<pre>Nothing to see here.
  Checkout README.md to start.</pre>`);
});

app.listen(port, async () => {
    console.log(`Server is listening on port: ${port}`);
    excel_data = await getExcelData();
});


