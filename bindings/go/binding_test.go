package tree_sitter_phits_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_phits "github.com/tree-sitter/tree-sitter-phits/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_phits.Language())
	if language == nil {
		t.Errorf("Error loading Phits grammar")
	}
}
