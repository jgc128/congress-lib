var datasets = ["lcc-rivers.json"];


var options;

// var width, height;
var width = 960,
    height = 500;

var n, // number of layers
    m // number of samples per layer
;

var data = {};

d3.select(window)
.on("load", function(){
    svg = d3.select("body").append("svg");

    options = {
        'datasetIndex': 0,
    };

    // create dataset select control
    var selectControl = d3.select('#control')
        .append('select')
        .attr('class','select')
    ;

    var optionsControl = selectControl
        .selectAll('option')
        .data(datasets).enter()
        .append('option')
        .text(function (d) { return d; });

    selectControl.on('change', function(){ updateDataset(this.value); });


    resizeGraphArea();

    // load data
    var loadQueue = queue().defer(d3.json, "lcc-titles.json");
    datasets.forEach(function(t) { loadQueue.defer(d3.json, t); });
    loadQueue.awaitAll(dataLoaded);
})
.on("resize", resizeGraphArea)
;




function dataLoaded(error, loadedData) {

    data.lccCatNames = loadedData[0];
    data.datasets = loadedData.slice(1);

    // hide loading indicator and show controls
    d3.select("#loading-indicator").remove();
    d3.selectAll(".box").style("display", "block").transition().duration(1000).style("opacity",1.0);


    data.graphData = transformData(data.datasets[options.datasetIndex]);

    drawGraph(data.graphData);
}
function resizeGraphArea() {
    width = window.innerWidth - 400;
    height = window.innerHeight - 400;

    svg.attr("width", width).attr("height", height);
}
function transformData(data) {

    var startChar = "A".charCodeAt(0);
    var endChar = "Z".charCodeAt(0);

    var startYear = 1900;
    var endYear = 1950;

    var result = [];

    n = endChar - startChar + 1;
    m = endYear - startYear + 1;

    for(var i = 0; i <= endChar - startChar; i++) {
        var lcc = String.fromCharCode(startChar + i);
        var lccData = [];
        for(var j = 0; j <= endYear - startYear; j++) {
            var c = 0;
            if(data[startYear + j] && data[startYear + j][lcc])
                c = data[startYear + j][lcc];

            lccData.push({'x': j, 'y': c, 'lcc': lcc, 'lcc_idx': i});
        }
        result.push(lccData);
    }


    return result;

}

function drawGraph(graphData) {

    var stack = d3.layout.stack()
        // .offset("zero")
        .offset("expand")
    ;
    var stackData = stack(graphData);

    var x = d3.scale.linear()
        .domain([0, m - 1])
        .range([0, width]);

    var y = d3.scale.linear()
        .domain([0, d3.max(stackData, function(layer) { return d3.max(layer, function(d) { return d.y0 + d.y; }); })])
        .range([height, 0]);

    var color = d3.scale.category20();//d3.scale.linear().range(["#aad", "#556"]);

    var area = d3.svg.area()
        .x(function(d) { return x(d.x); })
        .y0(function(d) { return y(d.y0); })
        .y1(function(d) { return y(d.y0 + d.y); });


    var streams = svg.selectAll("path")
        .data(stackData)
        .enter().append("path")
        .attr('class', 'stream')
        .attr("d", area)
        .style("fill", function(d) { return color(d[0]['lcc_idx']); })
    ;
    streams
        .append("title").text(function(d) { return data.lccCatNames[d[0]['lcc']]; })


    streams.on('mouseover', function(d) {
        streams.attr('class', 'stream-unselected');
        d3.select(this).attr('class', 'stream-selected');
    });

    // Set the stroke width back to normal when mouse leaves the node.
    streams.on('mouseout', function(d) {
        streams.attr('class', 'stream');
    });


    var xAxis = d3.svg.axis()
                .scale(x)
                .orient("top")
                .ticks(d3.time.years);
    svg.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate(0," + (-100).toString() + ")")
          .call(xAxis);

        //   http://stackoverflow.com/questions/14127065/d3-streamgraph-layer-fade-function
}


function updateDataset(datasetName) {
    var datasetIndex = datasets.indexOf(datasetName);
    options.datasetIndex = datasetIndex;
}
