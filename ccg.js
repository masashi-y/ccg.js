
const MARGIN = {left: 50, right: 50};
const NODESIZE = [50, 25];

function makeTree (tree) {
    const root = d3.cluster()
        .nodeSize(NODESIZE)
        (d3.hierarchy(tree));

    let x0 = Infinity;
    let x1 = -x0;
    root.each(d => {
        if (d.x > x1) x1 = d.x;
        if (d.x < x0) x0 = d.x;
    });

    const svg = d3.select("body").append("svg")
        .style("width", `${x1 - x0 + MARGIN.left + MARGIN.right + 20}`)
        .style("height", "100%");

    const g = svg.append("g")
        .attr("transform", `translate(${-x0 + MARGIN.left}, 30)`);
    return [root, svg, g];
};

d3.json("./tree.json").then(function(tree) {

    var [root, svg, g] = makeTree(tree);
    const base_category = g.append("g")
        .selectAll("g")
        .data(root.descendants())
        .join("g") 
        .append("text")
        .attr("class", "category")
        .text(d => d.data.cat);
    
    base_category.each(function(d, i){
        d["width"] = this.getBBox().width;
        console.log(d)
    })

    var [root, svg, g] = makeTree(tree);
    console.log(root);

    const link = g.append("g")
        .attr("fill", "none")
        .attr("stroke", "#555")
        .attr("stroke-opacity", 0.4)
        .attr("stroke-width", 1.5)
    .selectAll("path")
        .data(root.links())
        .join("path")
        .attr("d", d => `
            M${d.target.x},${d.target.y}
            L${d.source.x},${d.source.y}
        `);

    const node = g.append("g")
        .attr("stroke-linejoin", "round")
        .attr("stroke-width", 1)
        .selectAll("g")
        .data(root.descendants())
        .join("g")
        .attr("transform", d => `translate(${d.x},${d.y})`);;

    const category = node.append("text")
        .attr("class", "category")
        // .attr("dy", d => d.children ? "-0.45em" : "1.2em")
        .text(d => d.data.cat)
        .attr("text-anchor", "middle");

    node.append("rect")
        .attr("stroke", "black")
        .attr("fill", d => d.children ? "#FFF" : "#999")
        .attr("y", function (d) {
            return this.parentNode.getBBox().y;
        })
        .attr("x", function(d) {
            return this.parentNode.getBBox().x - 3;
        })
        .attr("width", function(d) {
            return this.parentNode.getBBox().width + 6;
        })
        .attr("height", "17px")
        .lower();
        // .attr("r", 2.5);

    category.clone(true)
        .filter(d => !d.children)
        .attr("class", "word")
        .text(d => d.data.word)
        .attr("dy", "2.4em");

});