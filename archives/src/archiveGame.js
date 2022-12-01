
/*********** INSTANCE VARIABLES *****************************************/ 

var GAME_LIST_ID = "";
var THE_TEAMS = {};
var TEAM_SCORES = []
var THE_ARCHIVE = [];
var SHOWING_FINAL_SCORE = true;

var TRELLO_IDS = {}

/*********** GETTING STARTED *****************************************/ 

mydoc.ready(function(){
    // Check for existing player if on player screen
    let path = location.pathname;

    // Set board name
    MyTrello.SetBoardName("jeopardy");

	let gameID = mydoc.get_query_param("gameID") ?? "";
	let gameDate = mydoc.get_query_param("gameDate") ?? "";
	let gameCode = mydoc.get_query_param("gameCode") ?? "";
	let gameName = mydoc.get_query_param("gameName") ?? "";

    if(gameID != "")
    {

        GAME_LIST_ID = gameID;

        // Get the game details
        setGameDetails(gameDate, gameCode, gameName);

        // Pull up the existing teams
        onGetTeams(GAME_LIST_ID);
    }
   
});

/*************** ACTIONS *******************************************/ 

// Get the teams that are in this archived game
function onGetTeams(listID)
{
    MyTrello.get_cards(listID, (data)=>{
        response = JSON.parse(data.responseText);

        teamCards = response.filter( (card)=>{
            return (!card["name"].includes("GAME_CARD"));
        });

        THE_TEAMS["total"] = teamCards.length;
        THE_TEAMS["set"] = 0;

        teamCards.forEach( (obj) => {
            let teamName = obj["name"];
            let teamCode = obj["id"];
            THE_TEAMS[teamCode] = {"name":teamName, "score":undefined, "wager":undefined };
        });

        getTeamScoresAndWagers();
        console.log(THE_TEAMS);
    });
}

// Get the team scores & wagers
function getTeamScoresAndWagers()
{
    let teamCodes = Object.keys(THE_TEAMS);

    // Loop through teams & set the scores/wagers;
    teamCodes.forEach( (teamCode) =>{
        setCustomFieldValue(teamCode, "Wager");
        setCustomFieldValue(teamCode, "Score");
    });
}

// Get custom field value for team
function setCustomFieldValue(teamCode, fieldName)
{

    MyTrello.get_card_custom_field_by_name(teamCode, fieldName, (data)=> {

        let response = JSON.parse(data.responseText);

        if(response.length == 1)
        {
            let value = response[0]?.value?.text ?? "n/a";
            value = (value != "n/a") ? Number(value) : value;
            THE_TEAMS[teamCode][fieldName.toLowerCase()] = value;

            // Add the score before wager
            let score = THE_TEAMS[teamCode]["score"];
            let wager = THE_TEAMS[teamCode]["wager"];

            if(Number.isInteger(score) && Number.isInteger(wager))
            {
                THE_TEAMS[teamCode]["preWagerScore"] = (score > wager) ? (score - wager) : (score + wager)
            }
            else
            {
                THE_TEAMS[teamCode]["preWagerScore"] = THE_TEAMS[teamCode]["score"]
            }
        }
        else
        {
            THE_TEAMS[teamCode][fieldName.toLowerCase()] = "n/a";
            THE_TEAMS[teamCode]["preWagerScore"] = 0;
        }
        // Check if all the scores have been set now;
        checkIfScoresSet(teamCode);
    });
}

// Check if a score is set
function checkIfScoresSet(teamCode)
{
    let hasScore = THE_TEAMS[teamCode]["score"] != undefined
    let hasWager = THE_TEAMS[teamCode]["wager"] != undefined

    // If this team is set, increment the set total
    if(hasScore && hasWager)
    {
        THE_TEAMS["set"] += 1
        TEAM_SCORES.push(THE_TEAMS[teamCode]);
    }

    // If all teams are set, then run the show list
    if(THE_TEAMS["set"] == THE_TEAMS["total"])
    {
        showList(TEAM_SCORES, "score");
        mydoc.showContent("#archive_section")
        mydoc.hideContent("#loading_gif")
    }
}

/************************ HELPERS **************************/

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
function showList(list,sortBy,reverse)
{

    sortedList = sortList(list,sortBy,reverse);

    let htmlList = "";

    for(var idx = 0; idx < sortedList.length; idx++)
    {
        item = sortedList[idx];
        if( item.hasOwnProperty("score") )
        {
            htmlList += `<tr>
                            <td>${idx+1}</td>
                            <td>${item['name']}</td>
                            <td>${item[sortBy].toLocaleString()}</td>
                            <td>${item['wager'].toLocaleString()}</td>
                        </tr>`;
        }
        else if ( item.hasOwnProperty("gameCode") )
        {
            // <td>${item['gameCode']}</td>

            let gID = item["gameID"];
            let gDate = item["date"];
            let gCode = item["gameCode"];
            let gName = encodeURI(item["gameName"]).replaceAll(/'/g, "%27");

            htmlList += `<tr>
                            <td>${item['date']}</td>
                            <td>${item['gameName']}<br/><span class='gameCodeSmaller'>(${item['gameCode']})</span></td>
                            <td>
                                <button class='openGameButton' onclick="onOpenGame('${gID}', '${gDate}', '${gCode}', '${gName}' )">
                                    Open Game
                                </button>
                            </td>
                        </tr>`;
        }
    }

    document.getElementById("archive_table_body").innerHTML = htmlList;
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


// Get the list of archived games
function setGameDetails(gameDate, gameCode, gameName)
{
    document.getElementById("archived_game_name").innerText = decodeURI(gameName);
    document.getElementById("archived_game_code").innerText = `(${gameCode})`;
    document.getElementById("archived_game_date").innerText = gameDate;
}