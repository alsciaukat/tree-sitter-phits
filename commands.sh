#!/bin/sh

function parse () {
	tree-sitter generate || return
    curtime=$(date)
	echo $curtime
	echo $curtime > ./test/$1.out
	echo $curtime > ./test/$1.debug
	tree-sitter parse -d normal ./test/$1.inp \
				>> ./test/$1.out \
				2>> ./test/$1.debug
	return 0
}

function build () {
	tree-sitter generate
	tree-sitter build -o ~/.emacs.d/tree-sitter/libtree-sitter-phits.so 
}
