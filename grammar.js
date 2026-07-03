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
		preamble: $ => seq(
			repeat1(choice(
				$.parameter_definition,
				$.comment,
			)),
			optional(alias($._parameter_statement, $.parameter_definition)),
		),
		body: $ => repeat1(choice(
			$.title_section,
			$.parameter_section,
			$.material_section,
			$.surface_section,
			$.cell_section,
			$.tally_section,
			$.data_section,
			$.other_section,
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
		
		// parameter, source
		parameter_section: $ => seq(
			$.parameter_section_header,
			optional($.parameter_section_body)
		),
		parameter_section_header: $ => prec.left(seq(
			'[',
			choice(
				/p\s*a\s*r\s*a\s*m\s*e\s*t\s*e\s*r\s*s/i,
				/s\s*o\s*u\s*r\s*c\s*e/i,
			),
			']',
			optional($.section_option),
			optional($.inline_comment),
		)),
		parameter_section_body: $ => seq(
			repeat1(choice(
				$.parameter_definition,
				$.extended_parameter_definition,
				$.continued_statement,
				$.file_definition,
				$.user_definition,
				$.insert_file_statement,
				$.skip_section_statement,
				$.termination_statement,
				$.comment,
			)),
			optional(alias($._parameter_statement, $.parameter_definition)),
		),
		file_definition: $ => prec.left(seq(
			$.file_field, optional(seq('(', $.index, ')')),
			'=',
			$.filepath,
			optional($.inline_comment),
		)),
		file_field: $ => token(/file/i),

		// tally
		tally_section: $ => seq(
			$.tally_section_header,
			optional($.tally_section_body)
		),
		tally_section_header: $ => prec.left(seq(
			'[',
			/t\s*-[\w\s]*\w/i,
			']',
			optional($.section_option),
			optional($.inline_comment),
		)),
		tally_section_body: $ => seq(
			repeat1(choice(
				$.title_definition,
				$.parameter_definition,
				$.extended_parameter_definition,
				$.continued_statement,
				$.user_definition,
				$.insert_file_statement,
				$.skip_section_statement,
				$.termination_statement,
				$.comment,
			)),
			optional(alias($._parameter_statement, $.parameter_definition)),
		),

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
				$.scattering_definition,
				$.user_definition,
				$.insert_file_statement,
				$.skip_section_statement,
				$.termination_statement,
				$.inline_comment,
			)),
			seq(
				$.reverse_order_clause,
				repeat1(choice(
					$.reverse_material_definition,
					$.reverse_extended_material_definition,
					$.reverse_continued_material_definition,
					$.user_definition,
					$.insert_file_statement,
					$.skip_section_statement,
					$.termination_statement,
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
		extended_material_definition: $ => prec(1, seq(
			$.material_definition,
			repeat1($.continued_material_definition),
		)),
		reverse_extended_material_definition: $ => prec(1, seq(
				$.reverse_material_definition,
				repeat1($.reverse_continued_material_definition),
		)),
		continued_material_definition: $ => prec.left(seq(
			repeat1($.element_definition),
			optional($.inline_comment),
		)),
		reverse_continued_material_definition: $ => prec.left(seq(
			repeat1($.reverse_element_definition),
			optional($.inline_comment),
		)),
		material_name: $ => choice(
			seq(/mat/i, '[', $.index, ']'),
			/m\d+/i,
		),
		scattering_definition: $ => seq(
			/mt\d+/i,
			$.material_id,
		),
		material_id: $ => $.string,
		element_definition: $ => seq($.element, $.ratio),
		reverse_element_definition: $ => seq($.ratio, $.element),
		element: $ => token(/\d*[a-zA-Z]+|\d+/),
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
			$.user_definition,
			$.insert_file_statement,
			$.skip_section_statement,
			$.termination_statement,
			$.c_comment,
		)),
		surface_definition: $ => prec.left(seq(
			field("surface_number", $.index),
			field("transform_number", optional($.index)),
			field("surface_symbol", choice(/[a-zA-Z]+/, /[a-zA-Z]\/[a-zA-Z]/)),
			prec.right(repeat1($.math_expression)),
			optional($.inline_comment),
			'\n',
		)),

		// cell
		cell_section: $ => seq($.cell_section_header, optional($.cell_section_body)),
		cell_section_header: $ => prec.left(seq(
			'[', /c\s*e\s*l\s*l/i, ']',
			optional($.section_option),
			optional($.inline_comment),
		)),
		cell_section_body: $ => repeat1(choice(
			$.cell_definition,
			$.continued_cell_definition,
			$.extended_cell_definition,
			$.user_definition,
			$.insert_file_statement,
			$.skip_section_statement,
			$.termination_statement,
			$.c_comment,
		)),
		cell_definition: $ => prec(1, seq(
			field("cell_number", $.index),
			field("material_number", $.integer),
			field("material_density", optional($.number)),
			repeat1($.surface_expression),
			optional(seq(/like/i, field("like_cell_number", $.index), /but/i)),
			optional($.cell_properties),
			'\n'
		)),
		continued_cell_definition: $ => prec.left(seq(
			/ {6,}/,
			choice(
				repeat1($.cell_properties),
				repeat1($.surface_expression),
				repeat1($.number)
			),
			'\n',
		)),
		extended_cell_definition: $ => prec(1, seq(
			$.cell_definition,
			repeat1($.continued_cell_definition),
		)),

		surface_expression: $ => prec(1, choice( // conflict with (number integer)
			$.integer,
			$.parenthesized_surface_expression,
			$.not_surface_expression,
			$.or_surface_expression,
		)),
		parenthesized_surface_expression: $ => prec(4, seq("(", prec.right(repeat1($.surface_expression)), ")")),
		not_surface_expression: $ => prec(3, seq('#', $.surface_expression)),
		or_surface_expression: $ =>  prec.left(2, seq($.surface_expression, ':', $.surface_expression)),
	 
		cell_properties: $ => prec.right(repeat1(choice(
			seq($.fill_field, '=', prec.right(repeat1($.universe_lattice_number))),
			seq($.field, '=', $.number),
		))),
		fill_field: $ => token(/fill/i),
		universe_lattice_number: $ => seq($.index, optional(seq(':', $.universe_lattice_number))),


		// other data sections
		//
		// do not move these last two section up
		// it is used to determine the precedence
		data_section: $ => seq(
			$.data_section_header,
			optional($.data_section_body),
		),
		data_section_header: $ => prec.left(seq(
			'[', $.data_section_name, ']',
			optional($.section_option),
			optional($.inline_comment),
		)),
		data_section_body: $ => repeat1(choice(
			$.line, // TODO: implement this
			$.comment,
			'\n',
		)),
		data_section_name: $ => choice(
			/t\s*r\s*a\s*n\s*s\s*f\s*o\s*r\s*m/i,
			/t\s*e\s*m\s*p\s*e\s*r\s*a\s*t\s*u\s*r\s*e/i,
			/m\s*a\s*t\s*t\s*i\s*m\s*e\s*c\s*h\s*a\s*n\s*g\s*e/i,
			/m\s*a\s*g\s*n\s*e\s*t\s*i\s*c\s*f\s*i\s*e\s*l\s*d/i,
			/e\s*l\s*e\s*c\s*t\s*r\s*o\s*m\s*a\s*g\s*n\s*e\s*t\s*i\s*c\s*f\s*i\s*e\s*l\s*d/i,
			/d\s*e\s*l\s*t\s*a\s*r\s*a\s*y/i,
			/t\s*r\s*a\s*c\s*k\s*s\s*t\s*r\s*u\s*c\s*t\s*u\s*r\s*e/i,
			/s\s*u\s*p\s*e\s*r\s*m\s*i\s*r\s*r\s*o\s*r/i,
			/e\s*l\s*a\s*s\s*t\s*i\s*c\s*o\s*p\s*t\s*i\s*o\s*n/i,
			/f\s*r\s*a\s*g\s*d\s*a\s*t\s*a/i,
			/v\s*o\s*l\s*u\s*m\s*e/i,
			/m\s*a\s*t\s*n\s*a\s*m\s*e\s*c\s*o\s*l\s*o\s*r/i,
			/r\s*e\s*g\s*n\s*a\s*m\s*e/i,
			/t\s*i\s*m\s*e\s*r/i,
			/u\s*s\s*e\s*r\s*d\s*e\s*f\s*i\s*n\s*e\s*d\s*p\s*a\s*r\s*t\s*i\s*c\s*l\s*e/i,
			/u\s*s\s*e\s*r\s*d\s*e\s*f\s*i\s*n\s*e\s*d\s*p\s*a\s*r\s*t\s*i\s*c\s*l\s*e/i
		),

		// other configuration sections
		// they contain both parameter_definition and data_line
		//
		// TODO: They need to be implemented
		// Delta Max, Importance, Weight Window, WW Bias
		// Forced Collisions, Repeated Collisions, Multiplier, Counter
		other_section: $ => seq(
			$.other_section_header,
			optional($.other_section_body),
		),
		other_section_header: $ => prec.left(seq(
			'[', /\w[\s\w]*\w/i, ']',
			optional($.section_option),
			optional($.inline_comment),
		)),
		other_section_body: $ => repeat1(choice(
			$.line,
			$.comment,
			'\n',
		)),

		terminator: $ => seq('[', /e\s*n\s*d/i, ']'),


		continued_statement: $ => prec.right(seq(
			$.math_expression,
			repeat(choice($.math_expression, $.time_unit)),
			optional($.inline_comment),
		)),
		time_unit: $ => token(prec(1, /[smhdy]/i)),
		parameter_definition: $ => seq($._parameter_statement, '\n'),
		// The body of a parameter statement, without its terminating newline.
		// Reused (aliased back to parameter_definition) as the optional last line
		// of a section for files that lack a trailing newline.
		_parameter_statement: $ => prec.right(seq(
			$.field,
			'=',
			$.expressions,
			optional(';'),
			optional($.inline_comment),
		)),
		extended_parameter_definition: $ => prec.left(1, seq(
			$.parameter_definition,
			repeat1($.continued_statement),
		)),
		title_definition: $ => seq(
			$.title_field,
			'=',
			$.title_string,
		),
		title_field: $ => token(/title/i),
		user_definition: $ => prec.left(seq(
			$.user_definition_directive,
			repeat1(seq("c", $.index, "[", $.math_expression, "]")),
			optional(';'), // TODO: check if semicolon is indeed allowed here.
			optional($.inline_comment),
		)),
		user_definition_directive: $ => token('set:'),
		insert_file_statement: $ => prec.left(seq(
			$.insert_file_statement_directive,
			'{', $.filepath, '}',
			optional($.line_numbers),
			optional($.inline_comment),
		)),
		insert_file_statement_directive: $ => token('infl:'),
		line_numbers: $ => seq('[', optional($.line_number), '-', optional($.line_number), ']'),
		line_number: $ => $.index,
		skip_section_statement: $ => prec.left(seq($.skip_section_statement_directive, optional($.inline_comment))),
		skip_section_statement_directive: $ => token('qp:'),
		termination_statement: $ => prec.left(seq($.termination_statement_directive, optional($.inline_comment))),
		termination_statement_directive: $ => token('q:'),

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

		field: $ => seq($.identifier, optional(seq('(', $.index, ')'))),
		identifier: $ => choice(
			token(/[$<]?[a-zA-Z][\w-]*[>]?/),
			/2d-type/i,
		),
		string: $ => token(/[a-zA-Z_][a-zA-Z0-9_\-.]*[+-]?/),
		title_string: $ => token(/.*/),
		filepath: $ => token(/[a-zA-Z0-9-_.:/\\]+/),
		section_option: $ => repeat1($.string),
		index: $ => token(/\d+/),
		integer: $ => token(/[-+]?\d+/),
		number: $ => choice(
			$.integer,
			$.float,
			/c\d+/i,
		),
		float: $ => choice(
			token(/-?(\d+[.]\d*|[.]\d+)/),
			token(/-?\d+[.]?\d*(e|E)[+-]?\d+/),
			token('pi'),
		),
		newline_escape: $ => token('\\\n'),
		
		inline_comment: $ => choice($.hash_comment, $.exclamation_comment),
		comment: $ => choice($.hash_comment, $.exclamation_comment, $.c_comment),
		dollar_comment: $ => token(/[$].*/),
		hash_comment: $ => token(/[#].*/),
		exclamation_comment: $ => token(/[!].*/),
		c_comment: $ => token(/ {0,4}c([ \t].*|\r?\n)/),
	}
});
