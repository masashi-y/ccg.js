import * as d3 from 'd3'

export interface MenuItem<T> {
	title: string,
	action: (elm: any, datum: T, index: number) => void
}

export type Callback = (datum: any, index: number) => void

export type Menu<T> = Array<MenuItem<T>>

export function d3ContextMenu<T>(menu: Menu<T>, openCallback?: Callback) {

	// create the div element that will hold the context menu
	d3.selectAll('.d3-context-menu').data([1])
		.enter()
		.append('div')
		.attr('class', 'd3-context-menu')

	// close menu
	d3.select('body').on('click.d3-context-menu', function() {
		d3.select('.d3-context-menu').style('display', 'none')
	})

	// this gets executed when a contextmenu event occurs
	return function(data: T, index: number) {	
		// @ts-ignore
		let elm = this

		d3.selectAll('.d3-context-menu').html('')
		let list = d3.selectAll('.d3-context-menu').append('ul')
		list.selectAll('li').data(menu).enter()
			.append('li')
			.html(d => d.title)
			.on('click', d => {
				d.action(elm, data, index)
				d3.select('.d3-context-menu').style('display', 'none')
			})

		// the openCallback allows an action to fire before the menu is displayed
		// an example usage would be closing a tooltip
		if (openCallback) openCallback(data, index)

		// display context menu
		d3.select('.d3-context-menu')
			.style('left', (d3.event.pageX - 2) + 'px')
			.style('top', (d3.event.pageY - 2) + 'px')
			.style('display', 'block')

		d3.event.preventDefault()
	};
};