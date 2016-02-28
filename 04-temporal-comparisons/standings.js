
/* Constants for our drawing area */
var width = 750,
    height = 500,
    margin = { top: 20, right: 20, bottom: 20, left:70 };

var parseDate = d3.time.format("%Y-%m-%d").parse;

var x = d3.time.scale().range([margin.left, width - margin.right]);
var y = d3.scale.linear().range([height - margin.bottom, margin.top]);

var xAxis = d3.svg.axis()
    .scale(x)
    .orient("bottom");
var yAxis = d3.svg.axis()
    .scale(y)
    .orient("left");

//realy get data in lines
var pointLine = d3.svg.line()
    .x(function(d){return x(d.date);})
    .y(function(d){return y(d.leaguePoints); });

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
        d3.nest().key(function(d){ return d.Away; }).entries(data),
        d3.nest().key(function(d){ return d.Home; }).entries(data)
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
        .append("g") //group element
        .attr("class", "line-graph")
        .attr("transform", "translate("+xAxis.tickPadding()+", 0)");

    var path = lines.append("path")
        .datum(function(d){ return d.value; }) //similar to data
        .attr("d", function(d){ return pointLine(d); });

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
    })
};

function gameOutcome(team, game, games){
    var isAway = (game.Away === team);
    var goals = isAway? +game.AwayScore : +game.HomeScore;
    var allowed = isAway? +game.HomeScore : +game.AwayScore;
    var decision = (goals > allowed)? 'win' : (goals < allowed) ? 'loss' :
        'draw';
    var points = (goals>allowed)? 3 : (goals<allowed) ? 0 : 1;
    return {
        date : game.Date,
        team : team,
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

reload();

