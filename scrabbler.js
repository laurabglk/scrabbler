Players = new Meteor.Collection("players");
Values = new Meteor.Collection("values");
Status = new Meteor.Collection("gameStatus");

if (Meteor.isClient) {
  LocalPlayers = new Meteor.Collection(null);
  Session.setDefault("status","not started");
  window.onload=function(){
	  if(window.location.pathname==="/"){
		Session.set("status","not started");
	  	var locPlayers=localStorage.getItem("players");
	  	if (locPlayers!==null){
			locPlayers = locPlayers.split(",");
			for (var i=0; i<locPlayers.length; i++)
	  			LocalPlayers.insert({name: locPlayers[i], score: 0});
		}
	  }
	  else {
	  	  Meteor.call('existing',window.location.pathname, 
			function(error,res){
				if (res===true)
					Meteor.call('getStatus',window.location.pathname,statUpdate);
				else{
					alert("Dieses Spiel existiert nicht (oder nicht mehr).\n Fange ein neues Spiel an!");
				 	window.location="/";
				}
			});	
	
	  }			
	  var statUpdate=function(error,stat){
		Session.set("status",stat);
		Meteor.call('getPlayer',window.location.pathname,function(error,player){Session.set("selected_player",player._id)});
	   	}
  }
   

  var set_player = function(player){
	Session.set("selected_player",player._id);
	Meteor.call('setPlayer',player.number,window.location.pathname);
  }
  var set_status = function(gameStatus){
	  Session.set("status", gameStatus);
	  Meteor.call('setStatus', gameStatus,window.location.pathname);
  }
  var game_started = function(){
	return Session.equals("status","started");
  }

  var start_game = function(){
	var myURL="/"+LocalPlayers.findOne()._id
	Meteor.call('startGame',localStorage.getItem("players"),myURL,function(error,res){ window.location=myURL;});
	localStorage.clear();
  }
	
  var restart_game = function(){
      	Meteor.call('restart',window.location.pathname);
	window.location="/";
	localStorage.clear();
  }

  var insert_player = function(playername){
	if (LocalPlayers.findOne({name: playername}))
		alert("Die Spieler müssen verschiedene Namen haben.");
	else
		if(localStorage.getItem("players")===null)
			localStorage.setItem("players",playername);
		else
			localStorage.setItem("players", localStorage.getItem("players")+","+playername);
		LocalPlayers.insert({name: playername, score: 0 });
  }
  var evaluate_word = function(word){
	 var points = 0;
	 word = word.toLowerCase();
	 for(var i=0;  i< word.length; i++){
		 var charvalue =Values.findOne({ch: word[i]});
		 if (charvalue === undefined){
			 if (word[i]==="ß")
				points=points+2*Values.findOne({ch: "s"}).value;
			 else if(word[i]==="2" && i<word.length-1){
				points=points+2*Values.findOne({ch: word[i+1]}).value;
			 	i++;
			 }else if(word[i]==="3" && i<word.length-1){
				points=points+3*Values.findOne({ch: word[i+1]}).value;
			 	i++;
			 }else{
				 alert("Das eingegebene Wort enthält nicht erlaubte Zeichen.");
			 	 points=0; break;
			 }
		 }else		 
			 points = points+ charvalue.value;
	 }
	 return points;
  }

  var remove_numbers = function(word){
	var new_word="";
	for(var i=0;  i< word.length; i++){
		if (word[i]!=="2" && word[i]!=="3")
		       	new_word=new_word+word[i];
	}
	return new_word;
  }

  var add_points = function(points){
	Players.update(Session.get("selected_player"), {$inc: {score: points}});
  }

  var next_player = function(){
	var seplayer = Session.get("selected_player");
   	seplayer = Players.findOne({_id: seplayer});	  	
	var next = (seplayer.number+1) % Players.find({url:window.location.pathname}).count();
	set_player(Players.findOne({url: window.location.pathname, number : next}));
  }

  Template.leaderboard.end = function() {
	return Session.equals("status","ending");
  }
  Template.leaderboard.not_started = function() {
	return Session.equals("status","not started");
  }

  Template.leaderboard.players = function () {
	if (Session.equals("status","not started"))
    		return LocalPlayers.find({}, {sort: {score: -1, name: 1}});
	return Players.find({url:window.location.pathname}, {sort: {score: -1, name: 1}});

  };

  Template.leaderboard.selected_name = function () {
    var player = Players.findOne(Session.get("selected_player"));
    return player && player.name;
  };

  Template.leaderboard.players_empty = function() {
	if (Players.find().count()===0) 
		return true;
	return false;
  }
  Template.leaderboard.game = function() {
	  return game_started();	
  }

  Template.player.selected = function () {
    return Session.equals("selected_player", this._id) ? "selected" : '';
  }
  
  Template.leaderboard.events({
    'click #check': function () {
	word = remove_numbers(document.getElementById("inc").value);
	url = "http://www.duden.de/suchen/dudenonline/"+word;
	window.open(url);
    },
    'keydown #inc': function() {
	if (event.which === 13){
		var word_value = evaluate_word(event.target.value);
		document.getElementById("eval").innerHTML=word_value;
	}
    },	
    'click #add': function() {
	    	add_points(parseInt(document.getElementById("eval").innerHTML));
		document.getElementById("inc").value='';
		document.getElementById("eval").innerHTML="0";
		next_player();
    },	    
    'click #double': function () {
		document.getElementById("eval").innerHTML=2*parseInt(document.getElementById("eval").innerHTML);
    },	
    'click #triple': function () {
		document.getElementById("eval").innerHTML=3*parseInt(document.getElementById("eval").innerHTML);
    },	
    'click #pass': function () {
	next_player();
    },
    'click #extra': function () {
	add_points(50+parseInt(document.getElementById("eval").innerHTML));
	document.getElementById("inc").value='';
	document.getElementById("eval").innerHTML="0";
	next_player();
    },		      
     'click .start': function () {
	start_game();
    },	
    'click input.resetAll': function() {
      Meteor.call('reset',window.location.pathname);
    },
    'click #end': function() {
	 set_status("ending");
    },
    'click input.restart': function() {
	restart_game();
    },
    'keydown #new-player': function() {
	if (event.which === 13){
		insert_player(event.target.value);
		event.target.value = '';
	}
    }			
  });
Template.notstarted.players_empty = function() {
	if (LocalPlayers.find().count()===0) 
		return true;
	return false;
  }
Template.ending.events({
    'keydown #dec': function() {
	if (event.which === 13){
		var word_value = evaluate_word(event.target.value);
		document.getElementById("decev").innerHTML=word_value;
	}
   },	
    'click #sub': function() {
	    	add_points(-parseInt(document.getElementById("decev").innerHTML));
		document.getElementById("dec").value='';
		document.getElementById("decev").innerHTML="0";
		next_player();
    }	

});
}

if (Meteor.isServer) {

   Meteor.startup(function () {
	   Values.remove({});
	  //deutsche Scrabble-Punktwerte 
	  //1 Punkt:
	  var character= new Array(7);
	  character[0] =["a","d","e","i","n","r","s","t","u"];
	  //2Punkte
	  character[1] =["g","h","l","o"];
	  //3Punkte:
	  character[2] =["b","m","w","z"];
	  //4Punkte:
	  character[3]=["c","f","k","p"];
	  //6Punkte
	  character[4]=["j","v","ä","ü"];
	  //8Punkte
	  character[5]=["x","ö"];
	  //10Punkte
	  character[6]=["q","y"];

	   for (var i = 0 ; i < character.length; i++){
		 for (var j = 0; j< character[i].length; j++){
			if(i<4)
	  			Values.insert({ch: character[i][j], value : i+1});
			if (i===4)
				 Values.insert({ch: character[i][j], value : 6});
			if (i===5)
				 Values.insert({ch: character[i][j], value : 8});
			if (i===6)
				 Values.insert({ch: character[i][j], value : 10});
		 }
 	    }

   });

  Meteor.methods({
	restart: function(clientURL){
		Players.remove({url: clientURL});
		Status.remove({url: clientURL});
   	 }
  });
  Meteor.methods({
	reset: function(clientURL) {
		player=0;
	 	Players.update({url : clientURL}, {$set: {score : 0}}, {multi : true})
	    },
	  setStatus : function(stat,clientURL){
		  Status.update({url: clientURL},{$set :{game: stat}});
	  },
	  getStatus : function(clientURL){
		  return Status.findOne({url: clientURL}).game;
	  }, 
	  startGame: function(clientPlayers,clientURL){
		clientPlayers = clientPlayers.split(",");
		for (var i=0; i<clientPlayers.length; i++)
	  		Players.insert({url: clientURL, name: clientPlayers[i], score: 0, number: i});
  		Status.insert({url: clientURL, game:"started", player: Players.findOne({url:clientURL, number:0})});
	  },

	  setPlayer: function(num,clientURL){
		  Status.update({url: clientURL},{$set :{player: Players.findOne({url:clientURL, number:num})}});
	  },
	  getPlayer: function(clientURL){
		  return Status.findOne({url:clientURL}).player;
	  },
	  existing: function(eurl){
		  if(Status.find({url: eurl}).count()===0)
			  return false;
		 return true;
	  }
   });

}
