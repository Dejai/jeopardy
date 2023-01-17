
/*********** INSTANCE VARIABLES *****************************************/ 

var THE_TEAMS = {};
var TEAM_SCORES = []
var SHOWING_FINAL_SCORE = true;
var CUSTOM_FIELDS = [];

/*********** GETTING STARTED *****************************************/ 

mydoc.ready(function(){
    // Check for existing player if on player screen
    let path = location.pathname;

    // Set board name
    MyTrello.SetBoardName("jeopardy");

	let gameListID = mydoc.get_query_param("gameID") ?? "";
	let gameName = mydoc.get_query_param("gameName") ?? "";
	let gameCode = mydoc.get_query_param("gameCode") ?? "";
	let gameDate = mydoc.get_query_param("gameDate") ?? "";

    if(gameListID != "")
    {
        // Get the game details
        mydoc.setContent("#archived_game_name", {"innerText": decodeURI(gameName)});
        mydoc.setContent("#archived_game_code", {"innerText": `(${gameCode})` });
        mydoc.setContent("#archived_game_date", {"innerText": gameDate });

        // Pull up the existing teams
        onGetTeams(gameListID);
    }
   
});

/*************** ACTIONS *******************************************/ 
// Get the custom fields
function getCustomFields()
{
    return new Promise( resolve =>{
        MyTrello.get_custom_fields( (data) =>{
            CUSTOM_FIELDS = JSON.parse(data.responseText);
            resolve(CUSTOM_FIELDS);
        })
    });
}



// Get the teams that are in this archived game
async function onGetTeams(listID)
{

    // Get the list of custom fields first
    await getCustomFields();

    MyTrello.get_cards(listID, (data)=>{
        response = JSON.parse(data.responseText);

        var teamCards = response.filter( (card)=>{
            return (!card["name"].includes("GAME_CARD"));
        });

        // Load the teams async
        loadTeams(teamCards);
    });
}

// Load the teams (ascyn)
async function loadTeams(teams)
{
    // Loop through each team & load
    for(var idx in teams)
    {
        let team = teams[idx];
        let teamID = team["id"];
        let teamObject = await getCardData(teamID);

        THE_TEAMS[teamID] = teamObject
        TEAM_SCORES.push(THE_TEAMS[teamID]);
    }

    // Show the teams
    showList(TEAM_SCORES, "score");
    mydoc.showContent("#toggleScores");
    mydoc.showContent("#archiveGameTable");
    mydoc.hideContent("#loading_gif");
}

// Get the value of the custom field from the given field name
function getCustomFieldValue(cardFields, fieldName)
{
    let fieldID = CUSTOM_FIELDS.filter((obj)=>{ return (obj["name"] == fieldName); })?.[0]?.id ?? undefined;
    let cardField = cardFields.filter((obj)=>{ return (obj["idCustomField"] == fieldID); })?.[0] ?? undefined;
    let value = cardField?.value?.text ?? "n/a";
    value = (value == "") ? "n/a" : value;
    return value;
}

// Get card data
function getCardData(teamCode)
{
    return new Promise( resolve => {

        MyTrello.get_single_card(teamCode, (data) => {

            let response = JSON.parse(data.responseText);
            console.log(response);

            let teamScore = getCustomFieldValue(response["customFieldItems"],"Score");
            let teamWager = getCustomFieldValue(response["customFieldItems"],"Wager");
            let teamPreWager = calculatePreWagerScore(teamScore, teamWager);

            let cardData = {
                "name":response["name"], 
                "score":teamScore,
                "wager":teamWager.replace("+","").replace("-",""),
                "preWagerScore": teamPreWager,
                "code":teamCode
            };
            resolve(cardData);
        });
    });
}

/*********** TEMP STARTED *****************************************/ 

function addSymbol(teamCode, symbol, value)
{
    let newValue = symbol + value.replace("+","").replace("-","");
	MyTrello.update_card_custom_field_by_name(teamCode,"Wager",newValue);
}

/************************ HELPERS **************************/

// Calculate the pre-wager score
function calculatePreWagerScore(score, wager)
{
    let preWagerScore = score;

    // The calculation is opposite of the wager symbol stored; 
    if(wager.includes("+") || wager.includes("-"))
    {
        wager = (wager.includes("+")) ? wager.replace("+", "-") : wager.replace("-", "+");
        let formula = `${score}${wager}`;
        console.log("Calculting wager with eval of: " + formula);
        preWagerScore = eval(formula);
    }
    else if (Number.isInteger(score) && Number.isInteger(wager))
    {
        preWagerScore = (score > wager) ? (score - wager) : (score + wager)
    }
    return preWagerScore;
}

// Sort the teams based on score vs. wager
function sortList(list,sortBy)
{
    sorted_list = list.sort(function(a,b){
            a_sorter = a[sortBy]
            b_sorter = b[sortBy]
            return b_sorter - a_sorter;
        });
    return sorted_list
}

// Show the (sorted) teams in the table
async function showList(list,sortBy,reverse)
{
    let htmlList = "";
    var sortedList = sortList(list,sortBy,reverse);

    // Loop through the list of teams
    for(var idx in sortedList)
    {
        let team = sortedList[idx];
        let teamObj = {
            "Index": Number(idx)+1,
            "Name": team["name"],
            "Score": team[sortBy],
            "Wager": team['wager'],
            "Code": team['code']
        }
        let rowHtml = await Promises.GetArchiveTeamRow(teamObj);
        htmlList += rowHtml;
    }
    mydoc.setContent("#archive_table_body", {"innerHTML":htmlList});
}

// Swap out the scores for the "pre-wager"
function onToggleScores()
{
    let toggleButton = document.getElementById("toggleScores");
    let scoreHeader = document.getElementById("scoreHeader");
    if(SHOWING_FINAL_SCORE)
    {
        showList(TEAM_SCORES,"preWagerScore");
        SHOWING_FINAL_SCORE = false;
        scoreHeader.innerHTML = "Pre-Wager <br/> Score";
        toggleButton.innerText = "Show Final Score";
    }
    else
    {
        showList(TEAM_SCORES, "score");
        SHOWING_FINAL_SCORE = true;
        scoreHeader.innerHTML = "Final <br/> Score";
        toggleButton.innerText = "Show Score Before Wager";

    }
}