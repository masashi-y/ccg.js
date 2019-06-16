
import * as d3 from 'd3'
// @ts-ignore
import { d3ContextMenu } from './d3-context-menu'
import { status, Tree, AUTO, test, NonTerminal, Terminal, Node, isTerminal, isNonTerminal } from './parser'
import { EditRecorder } from './recorder'
import { thresholdFreedmanDiaconis } from 'd3';

const MARGIN = { left: 150, right: 150 }
const NODESIZE: [number, number] = [1, 30]
const FEATURE_REGEX = /\[(.+?)\]/g

const statusIcon: {[key: string]: string;} = {
    "normal": "",
    "selected": "👆",
    "edited": "✏️"
}

// {
//     "unchanged": "white",
//     "edited":  "lightgreen",
//     "selected": "lightcoral"
// }

type d3Node = d3.HierarchyPointNode<Node>
type d3Selection<T extends d3.BaseType> = d3.Selection<T, Node, HTMLElement, any>

function computeNodeWidth(tree: Tree): void {
    let svg = d3.select("#tree-display").append("svg")
    let node = svg.append("g")
        .selectAll("g")
        .data(tree.nodes())
        .enter()
        .append("g")

    let category = node.append("text")
        .attr("class", "category")
        .attr("text-anchor", "middle")
        .html((d: Node) => d.cat.replace(
            FEATURE_REGEX,
            (_, p1) => `<tspan class="feature">${p1}</tspan>`
        ))

    node.append("rect")
        .attr("x", function() {
            return (this.parentNode as any).getBBox().x - 3
        })
        .attr("width", function() {
            return (this.parentNode as any).getBBox().width + 6
        })
        .attr("height", function() {
            return (this.parentNode as any).getBBox().height + 2
        })
        .lower()

    category.filter(isTerminal)
        .clone(true)
        .attr("class", "word")
        .attr("dy", "-1.8em")
        .text((d: Node) => (d as Terminal).word)

    node.each(function(d: Node) {
        d.width = this.getBBox().width + 6;
    })
    svg.remove()
}




class NodeContextMenu {
    constructor(public tree: VisualizedTree) {}

    draw() {
        let menu = [
            { title: "Edit category", action: this.editCategory },
            { title: 'Duplicate node', action: this.duplicateNode },
            { title: 'Delete node', action: this.deleteNode }
        ]
        return d3ContextMenu(menu)
    }

    duplicateNode = (elm: any, d: d3Node, i: number) => {
        this.tree.recorder.record()
        let node = d.data
        let child = isTerminal(node) ? Node.nonterminal(node.cat, []) : node.deepcopy()
        node.children = [child]
        this.tree.draw()
    }
        
    deleteNode = (elm: any, d: d3Node, i: number) => {
        if (d.parent) {
            this.tree.recorder.record()
            d.parent.data.removeChild(d.data)
            d.parent.data.pushChild(...d.data.children)
            this.tree.draw()
        }
    }

    editCategory = (elm: any, d: d3Node, i: number) => {
        // selectedNodeEdit = d;
        d3.selectAll(".category-edits").remove()
        d3.select("g").append("foreignObject")
            .attr("class", "category-edits")
            .attr("x", d.x)
            .attr("y", d.y)
            .attr("width", "205px")
            .attr("height", "38px")
            .html(`
                <form id="category-edit-form">
                    <input id="category-edit" type="text" value="${d.data.cat}"/>
                </form>
            `)
        let categoryEdit = document.getElementById("category-edit")!
        categoryEdit.focus()
        document.getElementById("category-edit-form")!.onsubmit = () => {
            // TODO
            let editResult = (categoryEdit as any).value
            if (d.data.cat != editResult) {
                this.tree.recorder.record()
                d.data.cat = editResult
                d3.selectAll(".category-edits").remove()
                this.tree.update()
            }
            return false
        }
    }
}

export class VisualizedTree {
    svg: d3Selection<SVGSVGElement>
    canvas: d3Selection<SVGGElement>
    links: d3Selection<SVGGElement>
    nodes: d3Selection<SVGGElement>
    recorder: EditRecorder<Node>
    selected?: d3Node
    root: d3Node
    constructor(public tree: Tree) {
        this.svg = d3.select<SVGSVGElement, Node>("#tree-display").append("svg")
        this.svg.on('click',
            () => d3.selectAll(".category-edits").remove())
        
        this.canvas = this.svg.append("g")
        this.links = this.canvas.append("g")
            .attr("fill", "none")
            .attr("stroke", "#555")
            .attr("stroke-opacity", 0.4)
            .attr("stroke-width", 1.5)
        this.nodes = this.canvas.append("g")
        this.recorder = new EditRecorder(tree.root)
        this.root = this.initCoordinates()
    }

    draw(): void {
        this.initCoordinates()
        this.update()
    }

    initCoordinates(): d3Node {
        let hierachy = d3.hierarchy(this.tree.root)
        computeNodeWidth(this.tree)

        this.root = d3.cluster<Node>()
                .nodeSize(NODESIZE)
                .separation((a, b) =>
                    (a.data.width + b.data.width) / 2 + 50)
                (hierachy)
        return this.root
    }

    update(): void {
        let x0 = Infinity
        let x1 = -x0
        this.root.each(d => {
            if (d.x > x1) x1 = d.x
            if (d.x < x0) x0 = d.x
        })

        this.svg.style("width", `${x1 - x0 + MARGIN.left + MARGIN.right + 30}`)
                .style("height", "100%")

        this.canvas.attr("transform", `translate(${MARGIN.left - x0}, 30)`)

        this.links.selectAll("path")
            .data(this.root.links())
            .join("path")
            .attr("d", d => `
                M ${d.target.x}, ${d.target.y}
                L ${d.source.x}, ${d.source.y}
            `)

        let nodes = this.nodes.selectAll("g")
            .data(this.root.descendants())
            .join("g")
            .attr("transform", d => `translate(${d.x}, ${d.y})`)
            .on("contextmenu", new NodeContextMenu(this).draw())
            .on("click", this.handleNodeAttachment)
            .html(null)  // remove all the content under this

        let category = nodes.append("text")
            .attr("class", "category")
            .attr("text-anchor", "middle")
            .html(d => d.data.cat.replace(
                FEATURE_REGEX,
                (_, p1) => `<tspan class="feature">${p1}</tspan>`
            ))

        nodes.append("rect")
            .lower()
            .attr("stroke", "black")
            .attr("fill", "white")
            .attr("y", function (d) {
                return (this.parentNode as any).getBBox().y
            })
            .attr("x", function(d) {
                return (this.parentNode as any).getBBox().x - 3
            })
            .attr("width", function(d) {
                return (this.parentNode as any).getBBox().width + 6
            })
            .attr("height", function(d) {
                return (this.parentNode as any).getBBox().height + 2
            })

        category.filter(d => isTerminal(d.data))
            .clone(true)
            .attr("class", "word")
            .attr("dy", "2.4em")
            .text(d => d.data.word!)

        nodes.append("text")
            .attr("y", function (d) {
                return (this.parentNode as any).getBBox().y + 40
            })
            .attr("x", function(d) {
                return (this.parentNode as any).getBBox().x - 3
            })
            .html(this.statusIcon)

    }

    statusIcon = (d: d3Node) => {
        if (d === this.selected) {
            return statusIcon["selected"]
        } else {
            return statusIcon[d.data.status]
        }
    }

    handleNodeAttachment = (d: d3Node) => {
        if (! this.selected) {
            if (d.parent) {
                this.selected = d
                this.update()
            }
        } else {
            let selected: d3Node = this.selected
            let source: Node = selected.data
            let target: Node = d.data
            if (! target.contains(source) && isNonTerminal(target)) {
                this.recorder.record()
                selected.parent!.data.removeChild(source)
                target.pushChild(source)
                target.children.sort((a: Node, b: Node) =>
                    a.leftMostChild().index < b.leftMostChild().index ? -1 : 1)
                let prevLeaves = this.recorder.peek()!.leaves().map(d => d.index)
                let curLeaves = this.tree.root.leaves().map(d => d.index)
                console.log(prevLeaves)
                console.log(curLeaves)
                if (prevLeaves.equals(curLeaves)) {
                    console.log("edited")
                    selected.data.status = "edited"
                    this.draw()
                } else {
                    this.undo()
                }
                this.selected = undefined
            } else {
                this.selected = undefined
                this.update()
            }
            console.log(this.selected)
        }
    }

    remove(): void {
        if (this.svg)
            this.svg.remove()
    }

    undo = () => {
        let record = this.recorder.undo()
        if (record) {
            this.tree.root = record
            this.draw()
        }
    }

    redo = () => {
        let record = this.recorder.redo()
        if (record) {
            this.tree.root = record
            this.draw()
        }
    }
}

