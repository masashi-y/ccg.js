
const MARGIN = {left: 50, right: 50};
const NODESIZE = [1, 25];

var CCGTree = function (tree, separation=null) {
    let cluster = d3.cluster().nodeSize(NODESIZE);
    if (separation)
        cluster = cluster.separation(separation);

    this.root = cluster(tree);

    let x0 = Infinity;
    let x1 = -x0;
    this.root.each(d => {
        if (d.x > x1) x1 = d.x;
        if (d.x < x0) x0 = d.x;
    });

    this.svg = d3.select("body").append("svg")
        .style("width", `${x1 - x0 + MARGIN.left + MARGIN.right + 20}`)
        .style("height", "100%");

    const g = this.svg.append("g")
        .attr("transform", `translate(${-x0 + MARGIN.left}, 30)`);

    this.link = g.append("g")
        .attr("fill", "none")
        .attr("stroke", "#555")
        .attr("stroke-opacity", 0.4)
        .attr("stroke-width", 1.5)
        .selectAll("path")
        .data(this.root.links())
        .join("path")
        .attr("d", d => `
            M${d.target.x},${d.target.y}
            L${d.source.x},${d.source.y}
        `);

    this.node = g.append("g")
        .attr("stroke-linejoin", "round")
        .attr("stroke-width", 1)
        .selectAll("g")
        .data(this.root.descendants())
        .join("g")
        .attr("transform", d => `translate(${d.x},${d.y})`);;

    this.category = this.node.append("text")
        .attr("class", "category")
        .text(d => d.data.cat)
        .attr("text-anchor", "middle");

    this.node.append("rect")
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

    this.category.clone(true)
        .filter(d => !d.children)
        .attr("class", "word")
        .text(d => d.data.word)
        .attr("dy", "2.4em");
}

CCGTree.prototype.remove = function() {
    this.svg.remove();
    return this;
}

CCGTree.prototype.computeNodeWidth = function() {
    this.node.each(function(d, i){
        d["width"] = this.getBBox().width + 6;
    });
    return this;
}

function separation(a, b) {
    return (a.width + b.width) / 2 + 5;
}

d3.json("./tree.json").then(function(tree) {
    const hierarchy = d3.hierarchy(tree);
    // make temporary tree to compute widths of each nodes
    new CCGTree(hierarchy).computeNodeWidth().remove();
    const ccg = new CCGTree(hierarchy, separation);
});

