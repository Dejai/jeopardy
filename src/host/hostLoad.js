/******  HOST: ON PAGE LOAD ****************************/ 
	
    mydoc.ready(function()
    {
        // Set board name
        MyTrello.SetBoardName("jeopardy");

        // Load the list of games
        onGetListOfGames();

        // Set search bar
        onSearchBlur();

    });


/******  GENERAL: Key things to do on load page ****************************/ 

	// Get the list of games available to select from;
	function onGetListOfGames()
	{
		try
		{
			// Get the ADMIN_LIST
			MyTrello.get_list_by_name( "ADMIN_LIST", (listData)=>{
				
				let listResp = JSON.parse(listData.responseText);
				let listID = listResp[0]?.id;

				// Get the cards from the matching list
				MyTrello.get_cards(listID, (data2) => {
					let response = JSON.parse(data2.responseText);

                    // Get list of games
                    let gameList = [];

					// Setup a map of all cards
					response.forEach((card) => {
                        gameList.push( {"ID": card["id"],"Name":card["name"] })
					});

                    // Sort games by name
                    gameList.sort( (a,b)=>{
                        if(a["Name"] < b["Name"]){ return -1; }
                        if(a["Name"] > b["Name"]){ return 1; }
                        return 0;
                    });

                    // Load game templates;
                    MyTemplates.getTemplate("../../templates/host/gameItem.html", gameList,(template)=>{
                        mydoc.setContent("#listOfGames", {"innerHTML": template});
                    });
				});
			});			
		}
		catch(error)
		{
			set_loading_results("Sorry, something went wrong!\n\n"+error);
		}
	}

    function onLoadGame(event)
    {
        let target = event.target;
        target = (target.targetName != "DIV") ? target.closest(".gameItem") : target;
        let id = target.getAttribute("data-jpd-game-id");
        console.log(id);

        if(id != undefined)
        {
            let newPath = location.href.replaceAll("load", "edit")
            let newQuery = `?gameid=${id}`;
            let newPage = newPath + newQuery;
            location.assign(newPage);
        }
    }

    // Get the search related values
    function onGetSearchValues()
    {
        let placeholder = document.getElementById("searchBar")?.getAttribute("data-jpd-placeholder");
        let filterValue = mydoc.getContent("#searchBar")?.innerText ?? "";
        filterValue = (filterValue == "" || filterValue == placeholder) ? " " : filterValue;

        return { "Filter": filterValue, "Placeholder": placeholder }
    }

    // Filter the list of games
    function onFilterGames()
    {
        let search = onGetSearchValues();
        document.querySelectorAll(".gameItem")?.forEach( (item)=>{
    

            let innerText = item.innerText.toUpperCase().replace("\n", " ");
            let searchText = search.Filter.toUpperCase().trim();

            if(!innerText.includes(searchText))
            {
                item.classList.add("hidden");
            }
            else
            {
                item.classList.remove("hidden");
            }
        }); 

    }

    // Focusing into the search bar
    function onSearchFocus()
    {
        let search = onGetSearchValues();
        if(search.Filter == " ")
        {
            mydoc.setContent("#searchBar", {"innerText":""});
        }
        mydoc.addClass("#searchBar", "searchText");
        mydoc.removeClass("#searchBar", "searchPlaceholder");
    }

    // Blurring from the search bar
    function onSearchBlur()
    {
        let search = onGetSearchValues();
        if(search.Filter == " ")
        {
            mydoc.addClass("#searchBar", "searchPlaceholder");
            mydoc.removeClass("#searchBar", "searchText");
            
            mydoc.setContent("#searchBar", {"innerText":search.Placeholder});
        }        
    }