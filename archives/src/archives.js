
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
		
		// Get the list of archived games
		onGetArchivedGames();
	});

/*************** ACTIONS *******************************************/ 

	// Get the list of archived games
	function onGetArchivedGames()
	{

		console.log("Getting games");
		MyTrello.get_lists("closed", (data)=> {
			let response = JSON.parse(data.responseText);

			console.log(response);

			response.forEach( (obj) =>{

				let gameName = obj["name"];
				let splits = gameName.split(" - ",3)
				let gameObj = {
								"date":splits[0],
								"dateInt":Date.parse(splits[0]), 
								"gameCode":splits[1],
								"gameName":splits[2],
								"gameID":obj["id"]
								};
				THE_ARCHIVE.push(gameObj);
			});
			// Show the list of archived games
			showList(THE_ARCHIVE, "dateInt", true);
		});
	}

	// Open a particular game
	function onOpenGame(gameID, gameDate, gameCode,gameName)
	{
		let newURL = `/archives/game.html?gameID=${gameID}&gameDate=${gameDate}&gameCode=${gameCode}&gameName=${gameName}`;
		window.open(newURL, "_top");
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