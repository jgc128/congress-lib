//   http://stackoverflow.com/questions/14127065/d3-streamgraph-layer-fade-function


var datasets = ["congress-lib-lcc-year.csv"];


var options;

// var width, height;
var width = 960,
    height = 500;

var padding = 50;
var leftPadding = 300;

var startYear = 1850;
var endYear = 1950;

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
    var loadQueue = queue().defer(d3.json, "lc_class.json");
    datasets.forEach(function(t) { loadQueue.defer(d3.csv, t); });
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
    width = window.innerWidth;
    height = window.innerHeight;

    svg.attr("width", width).attr("height", height);
}

function transformData(rawData) {
    // var qwe = d3.nest()
    //     .key(function(d) { return d.lcc[0] })
    //     .key(function(d) { return d.year })
    //     .rollup(function(leaves) { return leaves.length })
    //     .entries(data);

    // d3.nest().key(function(d) { return d.lcc[0] }).key(function(d) { return d.lcc[1] }).entries(data.datasets[0])

    data.firstLevel = {};
    data.secondLevel = {};

    // set array of counts

    for(var i = 0; i < rawData.length; i++) {
        var record = rawData[i];

        var cls = record.lcc[0];
        var subclass = cls;

        if (record.lcc.length > 1 && isNaN(parseInt(record.lcc[1])))
            var subclass = record.lcc.substring(0,2);

        var year = parseInt(record.year);

        if(!(cls in data.firstLevel)) {
            data.firstLevel[cls] = {};
            data.secondLevel[cls] = {};
        }
        if(!(subclass in data.secondLevel[cls])) {
            data.secondLevel[cls][subclass] = {};
        }
        if(!(year in data.firstLevel[cls])) {
            data.firstLevel[cls][year] = 0;
            data.secondLevel[cls][subclass][year] = 0;
        }

        data.firstLevel[cls][year] += 1;
        data.secondLevel[cls][subclass][year] += 1;
    }


    var result = [];

    var startChar = "A".charCodeAt(0);
    var endChar = "Z".charCodeAt(0);

    n = endChar - startChar + 1;
    m = endYear - startYear + 1;


    // first level
    for(var i = 0; i <= endChar - startChar; i++) {
        var lcc = String.fromCharCode(startChar + i);
        if(lcc == 'I' || lcc == 'O' || lcc == 'W' || lcc == 'X' || lcc == 'Y') // There are no I, O, W, X and Y classes
            continue;

        var lccData = [];
        for(var j = 0; j <= endYear - startYear; j++) {
            var c = 0;
            if(data.firstLevel[lcc] && data.firstLevel[lcc][startYear + j])
                c = data.firstLevel[lcc][startYear + j];

            lccData.push({'x': j, 'y': c, 'lcc': lcc, 'lcc_idx': i});
        }
        result.push(lccData);
    }

    // // set missing in the second level
    // for(l1 in data.secondLevel) {
    //     for(l2 in data.secondLevel[l1]) {
    //         for()
    //     }
    // }
    //

    return result;
}


function drawGraph(graphData) {

    var stack = d3.layout.stack()
        // .offset("zero")
        .offset("expand")
    ;
    window.stackData = stack(graphData);

    var x = d3.scale.linear()
        .domain([0, m - 1])
        .range([leftPadding, width - padding]);

    var y = d3.scale.linear()
        .domain([0, d3.max(stackData, function(layer) { return d3.max(layer, function(d) { return d.y0 + d.y; }); })])
        .range([height - padding, padding]);

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
        .append("title").text(function(d) { return data.lccCatNames[d[0]['lcc']].title; })


    streams.on('mouseover', function(d) {
        streams.attr('class', 'stream-unselected');
        d3.select(this).attr('class', 'stream-selected');
    });

    // Set the stroke width back to normal when mouse leaves the node.
    streams.on('mouseout', function(d) {
        streams.attr('class', 'stream');
    });


    // Axes
    var xAxis = d3.svg.axis()
        .scale(
            d3.scale.linear()
            .domain([startYear, endYear])
            .range([leftPadding, width - padding])
        )
        .tickFormat(d3.format('d'))
        // .ticks(d3.time.year, 25)
    ;
    var xAxisContainer = svg.append("g")
        .attr('class', 'axis')
        .attr("transform", "translate(0," + (height - padding) + ")")
        .call(xAxis)
    ;


    var yAxisValues = stackData.filter(function(a) {return a[0].y > 0.05 }).map(function(a){ return a[0].y0 + a[0].y / 2 });
    var yAxisValuesText = stackData.filter(function(a) {return a[0].y > 0.05 }).map(function(a) { return data.lccCatNames[a[0].lcc].title });
    var yAxisValuesTextScale = d3.scale.ordinal()
        .domain(yAxisValues)
        .range(yAxisValuesText)
    ;

    var yAxis = d3.svg.axis()
    	.scale(y)
        .tickValues(yAxisValues)
        .tickFormat(function(d) { return yAxisValuesTextScale(d) })
    	.orient("left")
    ;
    var yAxisContainer = svg.append("g")
        .attr('class', 'axis')
        .attr("transform", "translate(" + leftPadding + ",0)")
        .call(yAxis)
    ;


}


function updateDataset(datasetName) {
    var datasetIndex = datasets.indexOf(datasetName);
    options.datasetIndex = datasetIndex;
}
