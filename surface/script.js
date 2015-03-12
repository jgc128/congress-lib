var svg, surface;
var options;

var data = {};

var width, height;

var yaw=0.5,pitch=0.5, width=700, height=400, drag=false;

var tooltip;

// var colorScale = d3.scale.pow().exponent(0.1).domain([0,1000]).range([200,100]);//d3.scale.linear().domain([0,100]).range([100,0]);
var colorScale = d3.scale.category20();

d3.select(window)
.on("load", function(){

    options = {
        'year': parseInt(d3.select("#year").property("value")),
    };


    svg = d3.select("body").append("svg");
    svg.on("mousedown",function(){
        drag=[d3.mouse(this),yaw,pitch];
    }).on("mouseup",function(){
        drag=false;
    }).on("mousemove",function(){
        if(drag){
            var mouse=d3.mouse(this);
            yaw=drag[1]-(mouse[0]-drag[0][0])/50;
            pitch=drag[2]+(mouse[1]-drag[0][1])/50;
            pitch=Math.max(-Math.PI/2,Math.min(Math.PI/2,pitch));
            surface.turntable(yaw,pitch);
        }
    });

    // from http://bl.ocks.org/mbostock/1087001
    tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    d3.select('#year').on("change", function(){ updateYear(parseInt(this.value)) });

    resizeGraphArea();
    updateYear(options.year);

    queue()
        .defer(d3.json, "lc_class.json")
        .defer(d3.json, "lcc-data.json")
        .awaitAll(dataLoaded);
})
.on("resize", resizeGraphArea);




function dataLoaded(error, loadedData) {

    data.lccCatNames = loadedData[0];
    data.lccData = loadedData[1];

    data.surface = computeSurface(data.lccData);

    // hide loading indicator and show controls
    d3.select("#loading-indicator").remove();
    // d3.selectAll(".box").style("display","block").transition().duration(1000).style("opacity",1.0);

    plotSurface();
}
function resizeGraphArea() {
    width = window.innerWidth;
    height = window.innerHeight;

    svg.attr("width", width).attr("height", height);
}
function updateYear(year)
{
    options.year = year;
    d3.select('#year-label').text('Year: ' + year);
}
function computeSurface(data)
{
    var result = [];


    var i, j, k;
    var startChar = "A".charCodeAt(0);
    var endChar = "Z".charCodeAt(0);
    var mapping = function(char) { return char != "-" ? char.charCodeAt(0) - "A".charCodeAt(0) : endChar - startChar + 1; };

    for(i = 0; i <= endChar - startChar + 1; i++) {
        result[i] = [];
        for(j = 0; j <= endChar - startChar + 1; j++) {
            result[i][j] = { 'lcc_x': String.fromCharCode(startChar + i), 'lcc_y': String.fromCharCode(startChar + j), 'count': 0 };
        }
    }


    var lcc;
    for(k = 0; k < data.length; k++)
    {
        lcc = data[k].toLocaleUpperCase();
        result[mapping(lcc[0])][mapping(lcc[1])]['count'] -= 1;
    }

    return result;
}
function plotSurface()
{
    var group = svg.append("g");

    surface = group.data([data.surface])
        .surface3D(width,height);

    surface
        .surfaceHeight(function(d){
            return d.count;
        })
        .surfaceColor(function(d){
            // var c=d3.hsl(colorScale(d), 0.6, 0.5).rgb();
            // return "rgb("+parseInt(c.r)+","+parseInt(c.g)+","+parseInt(c.b)+")";
            return '#e3e3e3';
        })
        .surfaceMouseOver(function(d) {
            tooltip.transition()
                .duration(500)
                .style("opacity", 1);
        })
        .surfaceMouseOut(function(d) {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        })
        .surfaceMouseMove(function(d) {
            var lcc = d.data.lcc_x;
            if (d.data.lcc_y != '-')
                lcc  += d.data.lcc_y;

            var text = getLccTitle(lcc) + ' - ' + (-d.data.count);

            tooltip.text(text)
                  .style("left", (d3.event.pageX - 50) + "px")
                  .style("top", (d3.event.pageY - 70) + "px");
        })
    ;
}

function getLccTitle(lcc, includeCode) {
    var str;

    if(lcc.length == 1)
        str = data.lccCatNames[lcc].title;
    else if(lcc.length == 2)
        if (data.lccCatNames[lcc[0]] && data.lccCatNames[lcc[0]]['lccs'][lcc])
            str = data.lccCatNames[lcc[0]]['lccs'][lcc].title;
        else
            str = lcc;

    if (includeCode)
        str += ' - ' + lcc;

    return str;
}
