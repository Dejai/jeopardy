
// The list ID for the games
var GamesListID = undefined;

/****************  HOST: ON PAGE LOAD ****************************/ 
	
    mydoc.ready(function()
    {
        // Set board name
        MyTrello.SetBoardName("jeopardy");

        // Get the game list ID;
        onGetGameListID();
    });

/******* KEY FUNCTIONS *************/

    // Get and set the game list ID
    function onGetGameListID()
    {
        MyTrello.get_list_by_name("ADMIN_LIST", (listData)=>{
            let listResp = JSON.parse(listData.responseText);
            GamesListID = listResp[0]?.id ?? undefined;
        });
    }


    // Create a new game
    function onCreateNewGame()
    {

        // Show loading
        mydoc.showContent("#loadingGIF");
        mydoc.setContent(".notificationSection", {"innerHTML": ""});

        // Get the pieces of the game
        let gameName = mydoc.getContent("#gameName")?.value ?? "";
        let gameDesc = mydoc.getContent("#gameDescription")?.value ?? "";
        let passPhrase = mydoc.getContent("#passPhrase")?.value ?? "";

        if(gameName == "" || gameDesc == "" || passPhrase == "")
        {
            let message = "Please enter a value for all fields!";
            mydoc.setContent(".notificationSection", {"innerHTML": message});
            mydoc.hideContent("#loadingGIF");
            return;
        }

        if (GamesListID == undefined)
        {
            let message = "The Games List ID is not set! ";
            mydoc.setContent(".notificationSection", {"innerHTML": message});
            mydoc.hideContent("#loadingGIF");
            return 
        }

        // Create the actual card
        MyTrello.create_card(GamesListID, gameName, (data) => 
        {
            let response = JSON.parse(data.responseText);
            let gameID = response["id"];

            // Set the cookie for the pass phrase
            mydoc.setCookie(gameID, passPhrase, 30);

            // Update the description of the card
            MyTrello.update_card_description(gameID, gameDesc);
            
            // Add the pass to the custom field
            MyTrello.update_card_custom_field_by_name(gameID, "Pass Phrase", passPhrase, (updateData)=>{

                if(updateData.status == 200)
                {
                    console.log("Updated custom field == Pass Phrase");
                    let newPath = location.href.replaceAll("/create", "/edit");
                    newPath = newPath + `?gameid=${gameID}`;
                    location.href = newPath;
                }
            });			
        });
    }