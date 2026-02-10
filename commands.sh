function test () {
	tree-sitter generate	
	tree-sitter parse -d pretty ./test/$1.inp \
				> ./test/$1.out \
				2> >(sed -r 's/\x1B\[[0-9;]*[mK]//g' > ./test/$1.debug)
}
