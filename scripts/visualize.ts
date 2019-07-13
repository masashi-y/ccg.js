
import * as d3 from 'd3'
import { d3ContextMenu } from './d3-context-menu'
import { status, Tree, AUTO, test, NonTerminal, Terminal, Node, isTerminal, isNonTerminal, InvalidEditError } from './tree'
import { EditRecorder } from './recorder'

const MARGIN = { left: 150, right: 150 }
const NODESIZE: [number, number] = [1, 30]
const FEATURE_REGEX = /\[(.+?)\]/g

const statusIcon: {[key: string]: string;} = {
    "normal": "",
    "selected": "👆",
    "edited": "✏️"
}


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
        .attr("x", function() { return (this.parentNode as any).getBBox().x - 3 })
        .attr("width", function() { return (this.parentNode as any).getBBox().width + 6 })
        .attr("height", function() { return (this.parentNode as any).getBBox().height + 2 })
        .lower()

    category.filter(isTerminal)
        .clone(true)
        .attr("class", "word")
        .attr("dy", "-1.8em")
        .text((d: Node) => d.word!)

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
        let child = d.data.deepcopy()
        d.data.raise()
        d.data.children = [child]
        this.tree.draw()
        this.tree.cleanup()
    }
        
    deleteNode = (elm: any, d: d3Node, i: number) => {
        if (d.parent) {
            this.tree.recorder.record()
            d.parent.data.removeChild(d.data)
            d.parent.data.attachChildren(...d.data.children)
            if (this.tree.sanityCheck())
                this.tree.draw()
            else
                this.tree.undo()
        }
        this.tree.cleanup()
    }

    editCategory = (elm: any, d: d3Node, i: number) => {
        d3.selectAll(".category-edits").remove()
        this.tree.canvas1.select("g").append("foreignObject")
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
        let categoryEdit = document.getElementById("category-edit")! as HTMLInputElement
        categoryEdit.focus()
        document.getElementById("category-edit-form")!.onsubmit = () => {
            // TODO
            let editResult = categoryEdit.value
            if (d.data.cat != editResult) {
                this.tree.recorder.record()
                d.data.cat = editResult
                d3.selectAll(".category-edits").remove()
                this.tree.update()
            }
            return false
        }
        this.tree.cleanup()
    }
}

export class VisualizedTree {
    svg: d3Selection<SVGSVGElement>
    canvas1: d3Selection<SVGGElement>
    canvas: d3Selection<SVGGElement>
    links: d3Selection<SVGGElement>
    nodes: d3Selection<SVGGElement>
    recorder: EditRecorder<Node>
    selected?: d3Node
    root: d3Node
    xMin: number
    xMax: number
    constructor(public tree: Tree) {
        this.svg = d3.select<SVGSVGElement, Node>("#tree-display").append("svg")
            .attr('cursor', 'move')

        this.canvas1 = this.svg.append("g")
        this.canvas = this.canvas1.append("g")
        this.links = this.canvas.append("g")
            .attr("fill", "none")
            .attr("stroke", "#555")
            .attr("stroke-opacity", 0.4)
            .attr("stroke-width", 1.5)
        this.nodes = this.canvas.append("g")
        this.recorder = new EditRecorder(tree.root)
        this.root = this.initCoordinates()
        this.xMin = Infinity
        this.xMax = -Infinity
    }

    draw(): void {
        this.initCoordinates()
        this.update()
    }

    cleanup = (): void => {
        this.selected = undefined
    }

    initCoordinates(): d3Node {
        let hierachy = d3.hierarchy(this.tree.root)
        computeNodeWidth(this.tree)

        this.root = d3.cluster<Node>()
                .nodeSize(NODESIZE)
                .separation((a, b) =>
                    (a.data.width + b.data.width) / 2 + 50)
                (hierachy)
        this.root.each(d => {
            if (d.x < this.xMin) this.xMin = d.x
            if (d.x > this.xMax) this.xMax = d.x
        })
        return this.root
    }

    update(): void {
        // this.svg.style("width", `${x1 - x0 + MARGIN.left + MARGIN.right + 30}`)
        this.svg.style("width", "100%")
                .style("height", "100%")

        this.svg.call(d3.zoom<SVGSVGElement, Node>().on('zoom', () => 
            this.canvas1.attr('transform', d3.event.transform)))

        this.canvas.attr("transform", `translate(${MARGIN.left - this.xMin}, 30)`)
        
        this.links.selectAll("path")
            .data(this.root.links())
            .join("path")
            .attr("d", d => `
                M ${d.target.x}, ${d.target.y}
                L ${d.source.x}, ${d.source.y}
            `)
        
        let nodes = this.nodes.selectAll<SVGGElement, d3Node>("g")
            .data(this.root.descendants(), d => d.data.cat)
            .join("g")
            .attr("transform", d => `translate(${d.x}, ${d.y})`)
            .on("contextmenu", new NodeContextMenu(this).draw())
            .on("click", this.handleNodeAttachment)
            .html(null)  // remove all the content under this

        let category = nodes.append("text")
            .attr("class", "category")
            .attr("text-anchor", "middle")
            .html(d => d.data.cat.replace(FEATURE_REGEX, (_, p1) => `<tspan class="feature">${p1}</tspan>`))

        nodes.append("rect")
            .lower()
            .attr("stroke", "black")
            .attr("fill", "white")
            .attr("y", function() { return (this.parentNode as any).getBBox().y })
            .attr("x", function() { return (this.parentNode as any).getBBox().x - 3 })
            .attr("width", function() { return (this.parentNode as any).getBBox().width + 6 })
            .attr("height", function() { return (this.parentNode as any).getBBox().height + 2 })

        category.filter(d => isTerminal(d.data))
            .clone(true)
            .attr("class", "word")
            .attr("dy", "2.4em")
            .text(d => d.data.word!)

        nodes.append("text")
            .attr("y", function() { return (this.parentNode as any).getBBox().y + 40 })
            .attr("x", function() { return (this.parentNode as any).getBBox().x - 3 })
            .html(this.statusIcon)
    }

    statusIcon = (d: d3Node) => statusIcon[d === this.selected ? "selected" : d.data.status]

    sanityCheck = () => {
        let prevLeaves = this.recorder.peek()!.leaves.map(d => d.index)
        let curLeaves = this.tree.root.leaves.map(d => d.index)
        console.log(prevLeaves)
        console.log(curLeaves)
        return prevLeaves.equals(curLeaves)
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
                target.attachChildren(source)
                if (this.sanityCheck()) {
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

