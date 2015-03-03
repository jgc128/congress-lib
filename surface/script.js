var svg, surface;
var options;

var data = {};

var width, height;

var yaw=0.5,pitch=0.5, width=700, height=400, drag=false;

var colorScale = d3.scale.pow().exponent(0.1).domain([0,1000]).range([200,100]);//d3.scale.linear().domain([0,100]).range([100,0]);

d3.select(window)
.on("load", function(){
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

    options = {
        'year': parseInt(d3.select("#year").property("value")),
    };


    d3.select('#year').on("change", function(){ updateYear(parseInt(this.value)) });

    resizeGraphArea();
    updateYear(options.year);

    queue()
        .defer(d3.json, "lcc-titles.json")
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
    d3.selectAll(".box").style("display","block").transition().duration(1000).style("opacity",1.0);

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
            result[i][j] = 0;
        }
    }


    var lcc;
    for(k = 0; k < data.length; k++)
    {
        lcc = data[k];
        result[mapping(lcc[0])][mapping(lcc[1])] -= 1;
    }

    return result;
}
function plotSurface()
{
    var group = svg.append("g");

    surface = group.data([data.surface])
        .surface3D(width,height)
        .surfaceHeight(function(d){
            return d;
        }).surfaceColor(function(d){
            console.log(d);
            var c=d3.hsl(colorScale(d), 0.6, 0.5).rgb();
            return "rgb("+parseInt(c.r)+","+parseInt(c.g)+","+parseInt(c.b)+")";
        })
    ;
}
