
const MARGIN = {left: 50, right: 50};
const NODESIZE = [1, 30];

var nodeMap = null;
var hierarchy = null;
var selectedTree = null;
var selectedNode = null;
var history = [];

const nodeColor = {
    "unchanged": "white",
    "edited":  "lightgreen",
    "selected": "lightcoral"
}

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
        .selectAll("g")
        .data(this.root.descendants())
        .enter()
        .append("g")
        .attr("transform", d => `translate(${d.x},${d.y})`);

    let node = this.node;

    this.node.on('click', function(d, i) {
        if (selectedNode == null) {
            selectedNode = d;
            d.status = "selected";
            update();
        } else {
            if (d === selectedNode || !d.children || d.children.includes(selectedNode)) {
                selectedNode.status = "unchanged";
                selectedNode = null;
                update();
            } else {
                // record();
                d.children.push(selectedNode);
                d.children.sort(function(a, b) { return maxChildId(a) - maxChildId(b); });
                d.data.children = d.children.map(d => d.data);
                selectedNode.parent.children = selectedNode.parent.children.filter(d => d !== selectedNode);
                selectedNode.parent.data.children = selectedNode.parent.data.children.filter(d => d !== selectedNode.data);
                selectedNode.parent = d;
                selectedNode = null;
                update();
            }
        }
    });

    let category_edit_input = null;

    function popupCategoryEdit(d, i) {
        if (category_edit_input != null)
            category_edit_input.remove("foreignObject");
        category_edit_input = g.append("foreignObject")
            .attr("x", d.x)
            .attr("y", d.y)
            .attr("width", "205px")
            .attr("height", "38px")
            .html(`
                <form onSubmit="return handleCategoryEdit(${d.id})">
                    <input id="categoryEdit" type="text" value="${d.data.cat}"/>
                </form>`);
        document.getElementById("categoryEdit").focus();
    }

    this.node.on('dblclick', popupCategoryEdit);

    // this.node.on("contextmenu", function(d, i) {
    //     popupCategoryEdit(d, i);
    //     d3.event.preventDefault();
    // });

    let menu = [
        {
            title: "Edit category",
            action: function(elm, d, i) {
                popupCategoryEdit(d, i);
            }
        },
        {
            title: 'Duplicate node',
            action: function(elm, d, i) {
                console.log('You have clicked the second item!');
                console.log('The data for this circle is: ' + d);
            }
        }
    ];

    this.node.on("contextmenu", d3.contextMenu(menu));

    this.category = this.node.append("text")
        .attr("class", "category")
        .text(d => d.data.cat)
        .attr("text-anchor", "middle");

    this.rect = this.node.append("rect")
        .attr("stroke", "black")
        .attr("fill", d =>  nodeColor[d.status])
        .attr("y", function (d) {
            return this.parentNode.getBBox().y;
        })
        .attr("x", function(d) {
            return this.parentNode.getBBox().x - 3;
        })
        .attr("width", function(d) {
            return this.parentNode.getBBox().width + 6;
        })
        .attr("height", function(d) {
            return this.parentNode.getBBox().height + 2;
        })
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

function handleCategoryEdit(id) {
    // record();
    nodeMap[id].data.cat = document.getElementById("categoryEdit").value;
    nodeMap[id].status = "edited";
    update();
    return false;
}


function separation(a, b) {
    return (a.width + b.width) / 2 + 5;
}

function update() {
    if (selectedTree != null)
        selectedTree.remove();
    hierarchy.each(node => {
        if (selectedNode && node.status == "selected")
            return;
        else if (node.parent && node.parent.id !== node.origParentId
            || node.children && !node.children.map(d => d.id).equals(node.origChildrenIds)
            || node.data.cat != node.origCat)
            node.status = "edited";
        else
            node.status = "unchanged";
    });
    new CCGTree(hierarchy).computeNodeWidth().remove();
    selectedTree = new CCGTree(hierarchy, separation);
}

// function record() {
//     history.push(clone(hierarchy));
// }

function undo() {
    if (selectedTree != null)
        selectedTree.remove();
    hierachy = history.pop();
    update();
}

function maxChildId(node) {
    console.log(node);
    if (!node.children)
        return node.id;
    return Math.max.apply(null, node.children.map(maxChildId));
}

function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

d3.json("./tree.json").then(function(tree) {
    hierarchy = d3.hierarchy(tree);
    let i = 0;
    nodeMap = [];
    hierarchy.eachBefore(node => {
        node.id = i++;
        node.status = "unchanged";
        nodeMap.push(node);
    });
    console.log('aa');
    hierarchy.eachBefore(node => {
        if (node.parent)
            node.origParentId = node.parent.id;
        if (node.children)
            node.origChildrenIds = node.children.map(d => d.id);
        node.origCat = node.data.cat;
    });
    console.log('aa');
    update();
});




/////// ARRAY COMPARISON
// Warn if overriding existing method
if(Array.prototype.equals)
    console.warn("Overriding existing Array.prototype.equals. Possible causes: New API defines the method, there's a framework conflict or you've got double inclusions in your code.");
// attach the .equals method to Array's prototype to call it on any array
Array.prototype.equals = function (array) {
    // if the other array is a falsy value, return
    if (!array)
        return false;

    // compare lengths - can save a lot of time 
    if (this.length != array.length)
        return false;

    for (var i = 0, l=this.length; i < l; i++) {
        // Check if we have nested arrays
        if (this[i] instanceof Array && array[i] instanceof Array) {
            // recurse into the nested arrays
            if (!this[i].equals(array[i]))
                return false;       
        }           
        else if (this[i] != array[i]) { 
            // Warning - two different object instances will never be equal: {x:20} != {x:20}
            return false;   
        }           
    }       
    return true;
}
// Hide method from for-in loops
Object.defineProperty(Array.prototype, "equals", {enumerable: false});