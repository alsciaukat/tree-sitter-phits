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
		$.dollar_comment,
	],

	rules: {
		source_file: $ => seq(
			optional($.preamble),
			optional($.body),
		),
		preamble: $ => repeat1(choice(
			$.parameter_definition,
			$.comment_line,
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
			optional($.comment_inline),
		)),
		title_section_body: $ => repeat1(choice(
			$.line,
			$.comment_line,
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
			optional($.comment_inline),
		)),
		material_section_body: $ => choice(
			repeat1(choice(
				$.material_definition,
				'\n',
			)),
			seq(
				$.reverse_order_clause,
				repeat1(choice(
					$.material_definition_reverse,
					'\n',
				)),
			),
		),
		reverse_order_clause: $ => seq(/den/i, /nuc/i),
		material_definition: $ => seq(
			$.material_name,
			repeat1(seq(
				$.element,
				$.ratio
			)),
			optional($.comment_inline)
		),
		material_definition_reverse: $ => prec.right(seq(
			$.material_number,
			choice(
				repeat1(seq($.ratio, $.element)),
				$.material_id,
				),
			optional($.comment_inline)
			)
		),
		material_name: $ => choice(seq(/mat/i, '[', $.index, ']'), seq(/m/i, $.index)),
		material_id: $ => $.string,
		element: $ => token(/\d*\w+/),
		ratio: $ => $.number,

		// surface
		surface_section: $ => seq($.surface_section_header, optional($.surface_section_body)),
		surface_section_header: $ => prec.left(seq(
			'[', /s\s*u\s*r\s*f\s*a\s*c\s*e/i, ']',
			optional($.section_option),
			optional($.comment_inline),
		)),
		surface_section_body: $ => repeat1(choice(
			$.surface_definition,
			$.c_comment,
			'\n',
		)),
		surface_definition: $ => prec.left(seq(
			$.surface_number,
			optional($.transform_number),
			$.surface_symbol,
			prec.right(repeat1($.math_expression)),
			optional($.comment_inline),
		)),
		surface_number: $ => $.index,
		transform_number: $ => $.index,
		surface_symbol: $ => $.string,

		// cell
		cell_section: $ => seq($.cell_section_header, optional($.cell_section_body)),
		cell_section_header: $ => prec.left(seq(
			'[', /c\s*e\s*l\s*l/i, ']',
			optional($.section_option),
			optional($.comment_inline),
		)),
		cell_section_body: $ => repeat1(choice(
			$.cell_definition,
			$.c_comment,
			'\n',
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

		surface_expression: $ => choice(
			$.integer,
			$.parenthesized_surface_expression,
			$.not_surface_expression,
			$.or_surface_expression,
		),
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
			optional($.comment_inline),
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
			$.comment_line,
		)),

		terminator: $ => seq('[', /end/i, ']'),


		continued_statement: $ => prec.right(seq(
			repeat1($.math_expression),
			optional($.comment_inline),
		)),
		parameter_definition: $ => prec.left(seq(
			$.identifier,
			'=',
			$.expressions,
			optional(';'),
			optional($.comment_inline),
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
			optional($.comment_inline),
		)),
		insert_file_statement: $ => prec.left(seq(
			'infl:',
			'{', $.filename, '}',
			optional($.line_numbers),
			optional($.comment_inline),
		)),
		line_numbers: $ => seq('[', optional($.line_number), '-', optional($.line_number), ']'),
		line_number: $ => $.index,
		skip_section_statement: $ => prec.left(seq(token('qp:'), optional($.comment_inline))),
		termination_statement: $ => prec.left(seq(token('q:'), optional($.comment_inline))),

        expressions: $ => prec.left(repeat1($.expression)),
		expression: $ => choice(
			$.string,
			$.math_expression,
			$.newline_escape,
		),
		math_expression: $ => choice(
			$.integer,
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

		identifier: $ => seq(token(/[$<]?[a-zA-Z][\w-]*[>]?/), optional(seq('(', $.index, ')'))),
		string: $ => token(/[a-zA-Z_][a-zA-Z0-9_\-.]+/),
		filename: $ => token(/[a-zA-Z0-9-_. ]+/),
		section_name: $ => token(/[\s\w-]+?/i),
		index: $ => token(/\d+/),
		integer: $ => token(/-?\d+/),
		number: $ => choice(
			token(/-?(\d+[.]\d*|[.]\d+)/),
			token(/-?\d+[.]?\d*e[+-]?\d+/),
			token('pi'),
			seq('c', $.index)
		),
		newline_escape: $ => token('\\\n'),
		
		comment_inline: $ => choice($.hash_comment, $.exclamation_comment),
		comment_line: $ => choice($.hash_comment, $.exclamation_comment, $.c_comment),
		dollar_comment: $ => token(/[$].*/),
		hash_comment: $ => token(/[#].*/),
		exclamation_comment: $ => token(/[!].*/),
		c_comment: $ => token(/ {0,4}c .*/),
		

	}
});
