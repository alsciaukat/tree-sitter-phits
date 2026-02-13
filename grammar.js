/**
 * @file Parser for the input file of Particle and Heavy Ion Transport code System (PHITS)
 * @author Jeemin Kim <alsciokat@gmail.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
	name: "phits",
  
	extras: $ => [
		/\s/,
		'\r',
		$.dollar_comment,
	],

	rules: {
		source_file: $ => seq(
			optional($.preamble),
			optional($.body),
		),
		preamble: $ => repeat1(choice(
			$.parameter_definition,
			$.comment,
		)),
		body: $ => repeat1(choice(
			$.section,
			$.title_section,
			$.material_section,
			$.surface_section,
			$.cell_section,
			$.terminator,
		)),

		// title
		title_section: $ => seq(
			$.title_section_header,
			optional($.title_section_body),
		),
		title_section_header: $ => prec.left(seq(
			'[', token(/t\s*i\s*t\s*l\s*e/i), ']',
			optional($.section_option),
			optional($.inline_comment),
		)),
		title_section_body: $ => repeat1(choice(
			$.line,
			$.comment,
			'\n',
		)),
		line: $ => token(/[^\[].*/),
		
		// material
		material_section: $ => seq(
			$.material_section_header,
			optional($.material_section_body)
		),
		material_section_header: $ => prec.left(seq(
			'[', /m\s*a\s*t\s*e\s*r\s*i\s*a\s*l/i, ']',
			optional($.section_option),
			optional($.inline_comment),
		)),
		material_section_body: $ => choice(
			repeat1(choice(
				$.material_definition,
				$.extended_material_definition,
				$.continued_material_definition,
				$.inline_comment,
			)),
			seq(
				$.reverse_order_clause,
				repeat1(choice(
					$.reverse_material_definition,
					$.reverse_extended_material_definition,
					$.reverse_continued_material_definition,
					$.inline_comment,
				)),
			),
		),
		reverse_order_clause: $ => seq(/den/i, /nuc/i),
		material_definition: $ => prec.left(seq(
			$.material_name,
			choice(
				$.inline_comment,
				seq(
					repeat1($.element_definition),
					optional($.inline_comment),
				),
				seq(
					$.material_id,
					optional($.inline_comment),
				),
			),
		)),
		reverse_material_definition: $ => prec.left(seq(
			$.material_name,
			choice(
				$.inline_comment,
				seq(
					repeat1($.element_definition),
					optional($.inline_comment),
				),
				seq(
					$.material_id,
					optional($.inline_comment),
				)
			),
		)),
		extended_material_definition: $ => prec(1, choice(
			seq(
				$.material_definition,
				$.continued_material_definition,
			),
			seq(
				$.extended_material_definition,
				$.continued_material_definition,
			),
		)),
		reverse_extended_material_definition: $ => prec(1, choice(
			seq(
				$.reverse_material_definition,
				$.reverse_continued_material_definition,
			),
			seq(
				$.reverse_extended_material_definition,
				$.reverse_continued_material_definition,
			),
		)),
		continued_material_definition: $ => prec.left(seq(
			repeat1($.element_definition),
			optional($.inline_comment),
		)),
		reverse_continued_material_definition: $ => prec.left(seq(
			repeat1($.reverse_element_definition),
			optional($.inline_comment),
		)),
		material_name: $ => choice(seq(/mat/i, '[', $.index, ']'), /m\d+/i),
		material_id: $ => $.string,
		element_definition: $ => seq($.element, $.ratio),
		reverse_element_definition: $ => seq($.ratio, $.element),
		element: $ => token(/\d*[a-zA-Z]+/),
		ratio: $ => $.number,

		// surface
		surface_section: $ => seq($.surface_section_header, optional($.surface_section_body)),
		surface_section_header: $ => prec.left(seq(
			'[', /s\s*u\s*r\s*f\s*a\s*c\s*e/i, ']',
			optional($.section_option),
			optional($.inline_comment),
		)),
		surface_section_body: $ => repeat1(choice(
			$.surface_definition,
			$.c_comment,
		)),
		surface_definition: $ => prec.left(seq(
			$.surface_number,
			optional($.transform_number),
			$.surface_symbol,
			prec.right(repeat1($.math_expression)),
			optional($.inline_comment),
		)),
		surface_number: $ => $.index,
		transform_number: $ => $.index,
		surface_symbol: $ => $.string,

		// cell
		cell_section: $ => seq($.cell_section_header, optional($.cell_section_body)),
		cell_section_header: $ => prec.left(seq(
			'[', /c\s*e\s*l\s*l/i, ']',
			optional($.section_option),
			optional($.inline_comment),
		)),
		cell_section_body: $ => repeat1(choice(
			$.cell_definition,
			$.c_comment,
		)),
		cell_definition: $ => prec(1, seq(
			$.cell_number,
			$.material_number,
			optional($.material_density),
			repeat1($.surface_expression),
			optional(seq(/like/i, $.cell_number, /but/i)),
			optional($.cell_properties),
			'\n'
		)),
		cell_number: $ => $.index,
		material_number: $ => choice('-1', $.index),
		material_density: $ => $.number,

		surface_expression: $ => prec(1, choice( // conflict with (number integer)
			$.integer,
			$.parenthesized_surface_expression,
			$.not_surface_expression,
			$.or_surface_expression,
		)),
		parenthesized_surface_expression: $ => prec(4, seq("(", $.surface_expression, ")")),
		not_surface_expression: $ => prec(3, seq('#', $.surface_expression)),
		or_surface_expression: $ =>  prec.left(2, seq($.surface_expression, ':', $.surface_expression)),
	 
		cell_properties: $ => repeat1(choice(
			seq(/fill/i, '=', repeat1($.universe_lattice_number)),
			seq($.identifier, '=', $.number),
		)),
		universe_lattice_number: $ => seq($.index, optional(seq(':', $.universe_lattice_number))),

		// other sections	
		section: $ => seq(
			$.section_header,
			optional($.section_body)
		),
		section_header: $ => prec.left(seq(
			'[', $.section_name, ']',
			optional($.section_option),
			optional($.inline_comment),
		)),
		section_option: $ => repeat1($.string),
		section_body: $ => repeat1(choice(
			$.parameter_definition,
			$.extended_parameter_definition,
			$.continued_statement,
			$.user_definition,
			$.insert_file_statement,
			$.skip_section_statement,
			$.termination_statement,
			$.comment,
		)),

		terminator: $ => seq('[', /end/i, ']'),


		continued_statement: $ => prec.right(seq(
			repeat1($.math_expression),
			optional($.inline_comment),
		)),
		parameter_definition: $ => prec.right(seq(
			$.identifier,
			'=',
			$.expressions,
			optional(';'),
			optional($.inline_comment),
			'\n'
		)),
		extended_parameter_definition: $ => prec.left(1, choice(
			seq(
				$.parameter_definition,
				$.continued_statement,
			),
			seq(
				$.extended_parameter_definition,
				$.continued_statement,
			),
		)),
		user_definition: $ => prec.left(seq(
			'set:',
			repeat1(seq("c", $.index, "[", $.math_expression, "]")),
			optional(';'), // TODO: check if semicolon is indeed allowed here.
			optional($.inline_comment),
		)),
		insert_file_statement: $ => prec.left(seq(
			'infl:',
			'{', $.filename, '}',
			optional($.line_numbers),
			optional($.inline_comment),
		)),
		line_numbers: $ => seq('[', optional($.line_number), '-', optional($.line_number), ']'),
		line_number: $ => $.index,
		skip_section_statement: $ => prec.left(seq(token('qp:'), optional($.inline_comment))),
		termination_statement: $ => prec.left(seq(token('q:'), optional($.inline_comment))),

        expressions: $ => prec.right(repeat1($.expression)),
		expression: $ => choice(
			$.string,
			$.math_expression,
			seq('{', $.index, '-', $.index, '}'),
			$.newline_escape,
		),
		math_expression: $ => choice(
			$.number,
			prec(3, $.parenthesized_expression),
			prec(2, $.unary_expression),
			prec(1, $.binary_expression),
		),
		parenthesized_expression: $ => seq("(", $.math_expression, ")"),
		unary_expression: $ => seq($.unary_operator, $.math_expression),
		unary_operator: $ => choice("+", "-"),
		binary_expression: $ => choice(
			prec.left(3, seq($.math_expression, "**", $.math_expression)),
			prec.left(2, seq($.math_expression, choice("*", "/"), $.math_expression)),
			prec.left(1, seq($.math_expression, choice("+", "-"), $.math_expression)),
		),

		identifier: $ => choice(
			seq(/[$<]?[a-zA-Z][\w-]*[>]?/, optional(seq('(', $.index, ')'))),
			/2d-type/i,
		),
		string: $ => token(/[a-zA-Z_][a-zA-Z0-9_\-.]+/),
		filename: $ => token(/[a-zA-Z0-9-_. ]+/),
		section_name: $ => token(/\w[\s\w-]*\w/i),
		index: $ => token(/\d+/),
		integer: $ => token(/-?\d+/),
		number: $ => choice(
			$.integer,
			$.float,
			seq('c', $.index),
		),
		float: $ => choice(
			token(/-?(\d+[.]\d*|[.]\d+)/),
			token(/-?\d+[.]?\d*e[+-]?\d+/),
			token('pi'),
		),
		newline_escape: $ => token('\\\n'),
		
		inline_comment: $ => choice($.hash_comment, $.exclamation_comment),
		comment: $ => choice($.hash_comment, $.exclamation_comment, $.c_comment),
		dollar_comment: $ => token(/[$].*/),
		hash_comment: $ => token(/[#].*/),
		exclamation_comment: $ => token(/[!].*/),
		c_comment: $ => token(/ {0,4}c .*/),
		

	}
});
