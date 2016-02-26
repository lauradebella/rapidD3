
/* Constants for our drawing area */
var width = 750,
    height = 300,
    margin = {top: 20, right: 20, bottom: 20, left: 70};

/* The drawing area */
var svg = d3.select("#results")
  .append("svg")
  .attr("width", width)
  .attr("height", height)
;

//escalas dos objetos internos ao graficos, referente aos eixos
//escala da barra nos eixos x e y
var x = d3.scale
    .ordinal()
    .rangeRoundBands([margin.left, width - margin.right], 0.1);
    // comeca na margem esquerda(nao tem distanciamento na esquerda da pagina) 
    // e vai até o tamanho total menos a margem esquerda
    // 0.1 de espacamento entre elas
var y = d3.scale
    .linear()
    .range([height - margin.bottom, margin.top]);

//drawing axis objects
var xAxis = d3.svg.axis().scale(x).orient("bottom");
var yAxis = d3.svg.axis().scale(y).orient("left");

/* Our standard data reloading function */
var reload = function() {
  var data = [];
  d3.csv('afcw-results.csv', function(rows){
    redraw(rows);
  });
  //redraw(data);
};

/* Our standard graph drawing function */
var redraw = function(data) {

    x.domain(data.map(function(d,i){return i;}));
    y.domain([0, d3.max(data, function(d){return d.GoalsScored})]);
    var bars = svg.selectAll("rect.bar") 
    .data(data);

    //enter - atualiza para novos valores
    //coloca os dados no rect
    bars.enter()
        .append("rect")
        .classed("bar", true);

    //coloca atributos no grafico
    bars
        .attr("x", function(d,i){ return x(i) ; })
        .attr("width", x.rangeBand())
        //eixo de origem do y é para baixo - para isso criamos a funcao
        .attr("y", y(0))
        .attr("height", 0)
        .transition()
        .delay(function(d,i){return i*50;})
        .duration(800)
        .attr("y", function(d){
            //return height - margin.bottom - (d.GoalsScored * 50);
            //altura do grafico - borda de baixo do gráfico - altura da barra do gráfico
            return y(d.GoalsScored);
        })
        .attr("height", function(d) {return y(0) - y(d.GoalsScored); });

    var axisData = [
        {axis: xAxis, dx: 0, dy: (height - margin.bottom), clazz: 'x'},
        {axis: yAxis, dx: margin.left, dy: 0, clazz:'y'}
    ];
    var axis = svg.selectAll('g.axis')
        .data(axisData);
    axis.enter().append("g")
        .classed("axis", true);
    axis.each(function(d){
        d3.select(this)
            .attr("transform", "translate("+d.dx+", "+d.dy+")")
            .classed(d.clazz, true)
            .call(d.axis);
    });
};

reload();

