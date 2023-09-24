
/************************ GLOBAL VARIABLES ****************************************/
const MyTrello = new TrelloWrapper("jeopardy");

/*********************** GETTING STARTED *****************************/

	// Once doc is ready
	MyDom.ready( async() => {
		// Set login details
		await MyAuth.onGetLoginDetails(MyLoginDetails);
		
		// Load the adventures
		onLoadGames();
	});

/******** GETTING STARTED: Loading the Adventures & Labels; Check if logged in user***************************/

	// Load the set of adventures on the home page
	async function onLoadGames() {

        var cardsFromList = await MyTrello.GetCardsByListName("ADMIN_LIST");
        var trelloCards = cardsFromList.map(x => new TrelloCard(x));

        // Sort by date last activity
        trelloCards.sort( (a,b) =>{
            return (b.DateLastUpdated - a.DateLastUpdated);
        });

        // Add adventure as we go
        MyTemplates.getTemplate("src/templates/main/gameBlock.html", trelloCards, (template) => {
            MyDom.setContent("#listOfGames", {"innerHTML":template}, true);
        });
	}

    // Navigate to page
    function onNavigateToGame(block) { 
        var gameID = block.getAttribute("data-jpd-game-id");
        // MyUrls.navigateTo(`/host/edit/?gameid=${gameID}`);
        MyUrls.navigateTo(`/game/?id=${gameID}`);
    }

/********** SEARCH: Filtering & Searching for games **************/

	// Filter the list of games
    function onSearchAdventures()
    {
		// Show option to clear search;
		var searchFilter = MyDom.getContent("#searchBarInput")?.value ?? "";
		if(searchFilter != ""){ MyDom.showContent("#searchClearIcon"); }
		var contentIds = MyHomePage.searchContent(searchFilter);
		// Loop through content and show those that match
		document.querySelectorAll(".adventureBlock")?.forEach( (block) => {
			var contentId = block.getAttribute("data-adventure-id");
			var _content = !(contentIds.includes(contentId)) ? block.classList.add("hidden") : block.classList.remove("hidden");
		});
    }

	// Clear the search
	function onClearSearch()
	{
        MyDom.setContent("#searchBarInput" ,{"value":""});
		onSearchAdventures();
		MyDom.hideContent("#searchClearIcon");
		document.querySelector("#searchBarInput")?.blur();
	}

/********************* LISTENERS *************************************/

	// onNavigateToAdventure
	function onNavigateToAdventure(event){
		var target = event.target;
		var parent = target.closest(".adventureBlock");
		var adventureID = parent.getAttribute("data-adventure-id");
		if(adventureID != undefined){
			MyUrls.navigateTo(`/adventure/?id=${adventureID}`);
		}
	}
