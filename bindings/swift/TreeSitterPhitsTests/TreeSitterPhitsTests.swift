import XCTest
import SwiftTreeSitter
import TreeSitterPhits

final class TreeSitterPhitsTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_phits())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading Phits grammar")
    }
}
