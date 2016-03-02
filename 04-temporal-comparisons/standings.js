
/* Constants for our drawing area */
var width = 750,
    height = 500,
    margin = { top: 20, right: 20, bottom: 70, left:70 };

var parseDate = d3.time.format("%Y-%m-%d").parse;
var formateDate = d3.time.format("%b %d");

var x = d3.time.scale().range([margin.left, width - margin.right]);
var y = d3.scale.linear().range([height - margin.bottom, margin.top]);

var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom")
    .ticks(d3.time.weeks, 1)
    .tickFormat(formateDate);
var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left");

//realy get data in lines
var pointLine = d3.svg.line()
    .x(function(d){return x(d.date);})
    .y(function(d){return y(d.leaguePoints); });

var colors24 = [
  "#393b79","#5254a3","#6b6ecf","#9c9ede",
  "#3182bd","#6baed6","#9ecae1","#c6dbef",
  "#e6550d","#fd8d3c","#fdae6b","#fdd0a2",
  "#31a354","#74c476","#a1d99b","#c7e9c0",
  "#756bb1","#9e9ac8","#bcbddc","#dadaeb",
  "#843c39","#ad494a","#d6616b","#e7969c"
];

var gameDiv = d3.select("body")
    .append("div") 
    .attr("class", "tooltip")
    .style("opacity", 0);
/* The drawing area */
var svg = d3.select("#standings-chart")
  .append("svg")
  .attr("width", width)
  .attr("height", height);

/* Our standard data reloading function */
var reload = function() {
  d3.json('eng2-2013-14.json', function(results){

    //convert string to data
    results.forEach(function(d){ d.Date = parseDate(d.Date); });
    //debugger;
    x.domain([results[0].Date, results[results.length-1].Date]);
    y.domain([0,100]);

    data = d3.merge(
        results.map(function(d){
            d.Games.forEach(function(g){
                g.Date = d.Date;
            });
            return d.Games;
        })
    );

    var dataMap = d3.map();
    d3.merge([
        d3.nest().key(function(d){ return makeId(d.Away); }).entries(data),
        d3.nest().key(function(d){ return makeId(d.Home); }).entries(data)
    ]).forEach(function(d){
        //se ja tiver o time
        if(dataMap.has(d.key)){
            dataMap.set(d.key, d3.merge([dataMap.get(d.key), d.values])
                .sort(function(a,b){ return d3.ascending(a.Date, b.Date); }));   
        }else{ //se nao tiver o time
            dataMap.set(d.key, d.values);
        }
    });   
    dataMap.forEach(function(key,values){
        var games = [];
        values.forEach(function(g,i){
            games.push(gameOutcome(key,g,games));
        });
        dataMap.set(key, games);
    });
    //console.log(dataMap);
    redraw(dataMap);
  });
};

/* Our standard graph drawing function */
var redraw = function(data) {
    var lines = svg.selectAll('.line-graph')
        .data(data.entries());

    lines.enter()
        .append("g"); //group element
        
    lines.sort(function(a,b){
        var aPoints = a.value[a.value.length -1].leaguePoints;
        var bPoints = b.value[b.value.length -1].leaguePoints;
        return d3.descending(aPoints,bPoints);
        });

    lines.each(function(d,i){
        d3.select(this)
            .style("stroke", colors24[i])
            .attr("class", "line-graph")
            .attr("transform", "translate("+xAxis.tickPadding()+", 0)")
            .attr("id", d.key)
            .attr("data-legend", d.value[0].team)
            .on("click", function(e){return filterGame(d);});
    });

    var path = lines.append("path")
        .datum(function(d){ return d.value; }) //similar to data
        .attr("d", function(d){ return pointLine(d); });

    var circles = lines.selectAll("circle")
        .data(function(d){return d.value;});

    circles.enter()
        .append("circle")
        .attr("r", 3);

    circles.each(function (d){
        var color = d3.select(this.parentElement).style("stroke");
        d3.select(this)
            .attr("cx", x(d.date))
            .attr("cy", y(d.leaguePoints))
            .style("fill", color)
            .on("mouseover", function(e){return showGame(d,color);})
            .on("click", function(e){return showGame(d,color);})
            .on("mouseout", function(e){return hideGame();});
    });


    svg.append("g")
        .attr("class", "legend")
        .attr("transform", "translate("+(margin.left + 20)+","+y(95)+")")
        .call(d3.legend);

    var axis = svg.selectAll(".axis")
        .data([{axis:xAxis, x:0, y:y(0), clazz:"x"},
                {axis:yAxis,x:x.range()[0], y:0, clazz:"y"}]);

    axis.enter().append("g")
        .attr("class", function(d){ return "axis "+d.clazz;})
        .attr("transform", function(d){
            return "translate("+d.x+","+d.y+")";
        });

    axis.each(function(d){
        d3.select(this).call(d.axis);
    });

    axis.selectAll(".x.axis text")
        .style("text-anchor", "end")
        .attr({dx: "-0.8em", transform: "rotate(-65)"});

};

function gameOutcome(teamId, game, games){
    var isAway = (makeId(game.Away) === teamId);
    var goals = isAway? +game.AwayScore : +game.HomeScore;
    var allowed = isAway? +game.HomeScore : +game.AwayScore;
    var decision = (goals > allowed)? 'win' : (goals < allowed) ? 'loss' :
        'draw';
    var points = (goals>allowed)? 3 : (goals<allowed) ? 0 : 1;
    return {
        date : game.Date,
        team : isAway? game.Away : game.Home,
        align : isAway? 'away' : 'home',
        opponent : isAway? game.Home : game.Away,  
        goals: goals,
        allowed : allowed,
        venue: game.Venue,
        decision: decision,
        points: points,
        leaguePoints: d3.sum(games, function(d){ return d.points; }) + points
    };
}

function gameOutcomeHome(teamId, game, games){
    var isAway = (makeId(game.Away) === teamId);
    var goals = isAway? +game.AwayScore : +game.HomeScore;
    var allowed = isAway? +game.HomeScore : +game.AwayScore;
    var decision = (goals > allowed)? 'win' : (goals < allowed) ? 'loss' :
        'draw';
    var points = (goals>allowed)? 3 : (goals<allowed) ? 0 : 1;
    return {
        date : game.Date,
        team : isAway? game.Away : game.Home,
        align : isAway? 'away' : 'home',
        opponent : isAway? game.Home : game.Away,  
        goals: goals,
        allowed : allowed,
        venue: game.Venue,
        decision: decision,
        points: points,
        leaguePoints: d3.sum(games, function(d){ 
            if(teamId != isAway){ 
                return d.points; 
            }else{
                return 0;
            }
         }) + points
    };
}

function makeId(string){
    return string.replace(/[^A-Za-z0-9]/g,'');
}

function showGame(d,color) {
    gameDiv.transition()
        .duration(200)
        .style("opacity", 0)
        .style("background-color", "white");

    gameDiv
        .html(d.team+"(" + formateDate(d.date) + " - " + d.align + ")<br/>"
            +"Versus: " + d.opponent + "<br/>"
            +"Venue: "+ d.venue + "<br/>"
            +"Result: "+ d.goals + " - " + d.allowed + " " + d.decision + "<br/>"
            +"Points: "+ d.leaguePoints)
        .style({left:(d3.event.pageX +10) + "px",
                top:(d3.event.pageY -40) + "px"
            })
        .transition()
        .duration(200)
        .style("opacity", 0.9)
        .style("background-color", color);
}

function showGameMock(){

    d = {
        align: "home",
        allowed: 3,
        date: '20/01/2014',
        decision: "loss",
        goals: 0,
        leaguePoints: 31,
        opponent: "Rochdale",
        points: 0,
        team: "Hartlepool United",
        venue: "Victoria Park",
    }

    color = "#393b79"; 

    gameDiv
        .html(d.team+"(" + d.date + " - " + d.align + ")<br/>"
            +"Versus: " + d.opponent + "<br/>"
            +"Venue: "+ d.venue + "<br/>"
            +"Result: "+ d.goals + " - " + d.allowed + " " + d.decision + "<br/>"
            +"Points: "+ d.leaguePoints)
        .style({left:0 + "px",
                top:0 + "px"
            })
        .transition()
        .duration(200)
        .style("opacity", 0.9)
        .style("background-color", color);
}

function filterGame(d){

    var lines = svg.selectAll('.line-graph')
    lines.each(function(e){
            if(e.key == d.key){
                return d3.select(this)
                  .transition()
                  .duration(500)
                  .style("display", "initial");
                //return console.log(e.key);
            }else{
                return d3.select(this)
                  .transition()
                  .duration(500)
                  .style("display", "none");
            }
       });

}

function hideAllLines(){
    
    svg.selectAll('.line-graph')
        .transition()
        .duration(500)
        .style("display", "none");
}

function showAllLines(){
    
    svg.selectAll('.line-graph')
        .transition()
        .duration(500)
        .style("display", "initial");
}

function hideGame(){
    gameDiv.transition()
        .duration(500)
        .style("opacity", 0)
        .style("background-color", "white");
}

function changeData(){
    //changing scale
    //x nao muda pois sao os mesmos eixos
    //x.domain([results[0].Date, results[results.length-1].Date]);
    y.domain([0,10]);

    dataMap = d3.map();

    d3.merge([
        d3.nest().key(function(d){ return makeId(d.Away); }).entries(data),
        d3.nest().key(function(d){ return makeId(d.Home); }).entries(data)
    ]).forEach(function(d){
        //se ja tiver o time
        if(dataMap.has(d.key)){
            dataMap.set(d.key, d3.merge([dataMap.get(d.key), d.values])
                .sort(function(a,b){ return d3.descending(b.Date, a.Date); }));   
        }else{ //se nao tiver o time
            dataMap.set(d.key, d.values);
        }
    }); 

    dataMap.forEach(function(key,values){
            var games = [];
            values.forEach(function(g,i){
                games.push(gameOutcomeHome(key,g,games));
            });
            dataMap.set(key, games);
            //debugger;
    });

    var svg = d3.select("body").transition();
    svg.select(".y.axis") // change the y axis
        .duration(750)
        .call(yAxis);
    svg.select('.line-graph') // change the line
        .duration(750)
        .attr("d", redraw(dataMap));
}


reload();

