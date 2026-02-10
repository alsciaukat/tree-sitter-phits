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

	conflicts: $ => [
		[$.cell_properties],
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
			$.source_section,
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
		title_section_header: $ => seq(
			"[", /t\s*i\s*t\s*l\s*e/i, "]",
			optional($.section_option),
			optional($.comment_inline),
			"\n"
		),
		title_section_body: $ => repeat1(choice(
			$.line,
			$.comment_line,
		)),
		line: $ => seq(token(/[^\[].*/), '\n'),

		// other sections	
		section: $ => seq(
			$.section_header,
			optional($.section_body)
		),
		section_header: $ => seq(
			"[", $.section_name, "]",
			optional($.section_option),
			optional($.comment_inline),
			"\n"
		),
		section_option: $ => repeat1($.string),
		section_name: $ => token(/[\s\w]+?/),
		section_body: $ => repeat1(choice(
			$.statement,
			$.comment_line
		)),

		statement: $ => prec.left(seq(
			choice(
				$.user_definition,
				$.parameter_definition,
				$.insert_file_statement,
				$.skip_section_statement,
				$.termination_statement,
			),
			$.statement_end,
		)),
		statement_end: $ => prec.left(choice(
			seq(
				optional($.comment_inline),
				'\n',
			),
			seq(
				';',
				optional($.comment_inline)
			)
		)),
		user_definition: $ => seq('set:', repeat1(seq("c", $.positive_integer, "[", $.math_expression, "]"))),
		insert_file_statement: $ => prec.right(seq('infl:', '{', $.filename, '}', optional($.line_numbers))),
		line_numbers: $ => seq('[', optional($.line_number), '-', optional($.line_number), ']'),
		line_number: $ => $.positive_integer,
		list_definition: $ => seq(
			$.parameter_definition,
			repeat1($.parameter_row),
		),
		parameter_definition: $ => prec.left(seq(
			$.identifier,
			"=",
			$.expressions,
		)),
		parameter_row: $ => seq(
			$.expressions,
			optional($.comment_inline),
			'\n',
		),
		skip_section_statement: $ => token('qp:'),
		termination_statement: $ => token('q:'),

		identifier: $ => seq(token(/[$<]?\w[\w-]*\d*[>]?/), optional(seq('(', $.positive_integer, ')'))),
		filename: $ => token(/[a-zA-Z0-9-_. ]+/),
        expressions: $ => prec.left(repeat1($.expression)),
		expression: $ => choice(
			$.string,
			$.math_expression,
			$.newline_escape,
		),
		math_expression: $ => prec(2, choice(
			$.integer,
			$.number,
			prec(3, $.parenthesized_expression),
			prec(2, $.unary_expression),
			prec(1, $.binary_expression),
		)),
		parenthesized_expression: $ => seq("(", $.math_expression, ")"),
		unary_expression: $ => seq($.unary_operator, $.math_expression),
		unary_operator: $ => choice("+", "-"),
		binary_expression: $ => choice(
			prec.left(3, seq($.math_expression, "**", $.math_expression)),
			prec.left(2, seq($.math_expression, choice("*", "/"), $.math_expression)),
			prec.left(1, seq($.math_expression, choice("+", "-"), $.math_expression)),
		),
		integer: $ => prec(1000, seq(optional('-'), $.positive_integer)),
		positive_integer: $ => token(/\d+/),
		number: $ => prec(3, choice(
			seq(optional($.integer), '.', $.positive_integer, optional(/e[+-]?\d+/)),
			seq('c', $.positive_integer),
			'pi',
		)),
		string: $ => token(/[a-zA-Z_][a-zA-Z0-9_\-]+/),
		pure_string: $ => token(/[a-zA-Z]+/),
		newline_escape: $ => token('\\\n'),

		// source
		source_section: $ => seq($.source_section_header, optional($.source_section_body)),
		source_section_header: $ => seq(
			'[', /s\s*o\s*u\s*r\s*c\s*e/i, ']',
			optional($.section_option),
			optional($.comment_inline),
			'\n'
		),
		source_section_body: $ => repeat1(choice(
			$.statement,
		)),
		
		// material
		material_section: $ => seq($.material_section_header, optional($.material_section_body)),
		material_section_header: $ => seq(
			'[', /m\s*a\s*t\s*e\s*r\s*i\s*a\s*l/i, ']',
			optional($.section_option),
			optional($.comment_inline),
			'\n'
		),
		material_section_body: $ => choice(
			repeat1($.material_definition),
			seq($.reverse_order_clause, repeat1($.material_definition_reverse))
		),
		reverse_order_clause: $ => seq(/den/i, /nuc/i),
		material_definition: $ => seq(
			$.material_name,
			repeat1(choice(
				seq($.element, $.ratio),
				$.comment_inline,
			)),
		),
		material_definition_reverse: $ => prec.right(seq(
			$.material_number,
			choice(
				repeat1(choice(
					seq($.ratio, $.element),
					$.comment_inline,
				)),
				seq(
					$.material_id,
					optional($.comment_inline)
				),
			)
		)),
		material_name: $ => choice(seq(/mat/i, '[', $.positive_integer, ']'), seq(/m/i, $.positive_integer)),
		material_id: $ => $.string,
		element: $ => token(/\d*\w+/),
		ratio: $ => $.number,

		// surface
		surface_section: $ => seq($.surface_section_header, optional($.surface_section_body)),
		surface_section_header: $ => seq(
			'[', /s\s*u\s*r\s*f\s*a\s*c\s*e/i, ']',
			optional($.section_option),
			'\n'
		),
		surface_section_body: $ => repeat1(choice(
			$.surface_definition,
			$.c_comment,
		)),
		surface_definition: $ => seq(
			$.surface_number,
			optional($.transform_number),
			$.surface_symbol,
			$.surface_parameters,
		),
		surface_number: $ => $.positive_integer,
		transform_number: $ => $.positive_integer,
		surface_symbol: $ => $.pure_string,
		surface_definition: $ => prec.right(repeat1($.math_expression)),

		// cell
		cell_section: $ => seq($.cell_section_header, optional($.cell_section_body)),
		cell_section_header: $ => seq(
			'[', /c\s*e\s*l\s*l/i, ']',
			optional($.section_option),
			'\n'
		),
		cell_section_body: $ => repeat1(choice(
			$.cell_definition,
			$.c_comment,
		)),
		cell_definition: $ => seq(
			$.cell_number,
			$.material_number,
			optional($.material_density),
			$.cell_parameters,
		),
		cell_number: $ => $.positive_integer,
		material_number: $ => $.positive_integer,
		material_density: $ => $.number,
		cell_parameters: $ => seq(
			$.surface_expression,
			optional(seq(/like/i, $.cell_number, /but/i)),
			optional($.cell_properties)
		),
		surface_expression: $ => choice(
			$.surface_number,
			seq('-', $.surface_number),
			prec(3, $.parenthesized_surface_expression),
			prec(2, $.unary_surface_expression),
			prec(1, $.binary_surface_expression),
		),
		parenthesized_surface_expression: $ => seq("(", $.surface_expression, ")"),
		unary_surface_expression: $ => seq('#', $.surface_expression),
		binary_surface_expression: $ => choice(
			prec.left(2, seq($.surface_expression, ' ', $.surface_expression)),
			prec.left(1, seq($.surface_expression, ':', $.surface_expression)),
		),
	 
		cell_properties: $ => repeat1(choice(
			seq($.identifier, '=', $.number),
			seq(/fill/i, '=', repeat1($.universe_lattice_number)),
		)),
		universe_lattice_number: $ => seq($.positive_integer, optional(seq(':', $.universe_lattice_number))),

		terminator: $ => seq('[', /end/i, ']'),

		comment_inline: $ => choice($.hash_comment, $.exclamation_comment),
		comment_line: $ => choice($.hash_comment, $.exclamation_comment, $.c_comment),
		dollar_comment: $ => token(/[$].*/),
		hash_comment: $ => token(/[#].*/),
		exclamation_comment: $ => token(/[!].*/),
		c_comment: $ => token(/ {0,4}c .*/),
	}
});
