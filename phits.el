;; -*- lexical-binding: t; -*-

(defcustom phits-dir
  (cond ((eq system-type 'gnu/linux) "/opt/phits")
		((eq system-type 'windows-nt) "C:/phits"))
  "The root directory of phits installation."
  :type 'directory
  :group 'phits)

(defvar-local phits-inp-ts--index-cache nil
  "Memo of (TICK . (SURFACE-INDICES . CELL-INDICES)) for this buffer.
Recomputed by `phits-inp-ts--index-sets' whenever the buffer text
changes, so a single fontification pass queries the tree once instead
of re-traversing it for every integer.")


(defun phits-inp-ts--get-surface-indices ()
  "List the surface numbers declared in the surface section, or nil
when there is no surface section."
  (when-let* ((root (treesit-buffer-root-node))
			  (section-body (treesit-search-subtree root "surface_section_body")))
	(seq-map (lambda (i) (string-to-number (treesit-node-text (cdr i) t)))
			 (treesit-query-capture section-body
									'((surface_definition
									   surface_number: (index) @index))))))

(defun phits-inp-ts--get-cell-indices ()
  "List the cell numbers declared in the cell section, or nil when
there is no cell section."
  (when-let* ((root (treesit-buffer-root-node))
			  (section-body (treesit-search-subtree root "cell_section_body")))
	(seq-map (lambda (i) (string-to-number (treesit-node-text (cdr i) t)))
			 (treesit-query-capture section-body
									'((cell_definition
									   cell_number: (index) @index))))))

(defun phits-inp-ts--index-sets ()
  "Return (SURFACE-INDICES . CELL-INDICES) for the current buffer.
The tree is queried in place; the result is memoized per
`buffer-chars-modified-tick' so every integer in one fontification
pass shares a single query and it refreshes automatically on edits."
  (let ((tick (buffer-chars-modified-tick)))
	(unless (eql (car phits-inp-ts--index-cache) tick)
	  (setq phits-inp-ts--index-cache
			(cons tick (cons (phits-inp-ts--get-surface-indices)
							 (phits-inp-ts--get-cell-indices)))))
	(cdr phits-inp-ts--index-cache)))


(defun phits-inp-ts--fontify-cell-index (node override start end &rest _)
  (let* ((sets (phits-inp-ts--index-sets))
		 (index (abs (string-to-number (treesit-node-text node t)))))
	(when (and (not (member index (car sets)))
			   (member index (cdr sets)))
	  (treesit-fontify-with-override (treesit-node-start node) (treesit-node-end node) 'font-lock-constant-face t))))


;;;###autoload
(defun phits-ts-run-phits ()
  (interactive)
  (let ((file-name
		 (if (eq major-mode 'phits-inp-ts-mode)
			 (buffer-file-name)
		   (read-file-name "Select input file: "))))
	(cond ((eq system-type 'windows-nt)
		   (start-process "detached" nil "powershell" "-noProfile" "-Command" (concat "Start-Process '" phits-dir "/bin/phits.bat " file-name)))
		  ((eq system-type 'gnu/linux)
		  (async-shell-command (concat "phits.sh " file-name))))))

;;;###autoload
(defun phits-ts-run-phig3d ()
  (interactive)
  (let ((file-name
		 (if (eq major-mode 'phits-inp-ts-mode)
			 (buffer-file-name)
		   (read-file-name "Select input file: ")))))
  (shell-command (concat "phig3d.sh " file-name)))

;;;###autoload
(defun phits-ts-run-angel ()
  (interactive)
  (let ((file-name
		 (if (eq major-mode 'phits-inp-ts-mode)
			 (buffer-file-name)
		   (read-file-name "Select input file: ")))))
  (shell-command (concat "angel.sh " file-name)))

;;;###autoload
(defun phits-ts-run-dchain ()
  (interactive)
  (let ((file-name
		 (if (eq major-mode 'phits-inp-ts-mode)
			 (buffer-file-name)
		   (read-file-name "Select input file: ")))))
  (shell-command (concat "dchain.sh " file-name)))


(defvar phits-ts-mode-map
  (let ((map (make-sparse-keymap)))
	(define-key map (kbd "C-c r") #'phits-ts-run-phits-current-file)
	map)
  "Keymap for Phits INP.")

(defvar phits-inp-ts-font-lock-settings
  (treesit-font-lock-rules
   :language 'phits
   :feature 'comment
   '((comment) @font-lock-comment-face
	 (inline_comment) @font-lock-comment-face
	 (dollar_comment) @font-lock-comment-face
	 (c_comment) @font-lock-comment-face)
   :language 'phits
   :feature 'keyword
   '((identifier) @font-lock-keyword-face
	 (fill_field) @font-lock-keyword-face
	 (file_field) @font-lock-keyword-face
	 (title_field) @font-lock-keyword-face)
   :language 'phits
   :feature 'error
   '((ERROR) @flymake-error)
   :language 'phits
   :feature 'constant
   '((number) @font-lock-number-face)
   :language 'phits
   :feature 'directive
   '((user_definition_directive) @font-lock-preprocessor-face
	 (insert_file_statement_directive) @font-lock-preprocessor-face
	 (skip_section_statement_directive) @font-lock-preprocessor-face
	 (termination_statement_directive) @font-lock-preprocessor-face)
   :language 'phits
   :feature 'index
   '((material_name (index) @font-lock-property-name-face)
	 (cell_definition
	  material_number: (integer) @font-lock-property-name-face)
	 (surface_definition
	  surface_number: (index) @font-lock-function-name-face)
	 (surface_expression (integer) @font-lock-function-name-face)
	 (cell_definition
	  cell_number: (index) @font-lock-constant-face))
   :language 'phits
   :feature 'icell
   :override t
   '((surface_expression (integer) @phits-inp-ts--fontify-cell-index))))

(defun phits-inp-ts-setup ()
  (modify-syntax-entry ?# "<")
  (modify-syntax-entry ?$ "<")
  (modify-syntax-entry ?! "<")
  (modify-syntax-entry ?\n ">")
  (setq-local comment-start "$")
  (setq-local comment-use-syntax t)

  (setq-local treesit-font-lock-settings phits-inp-ts-font-lock-settings)
  (setq-local treesit-font-lock-feature-list
			  '((comment)
				(directive keyword constant index)
				(error icell)))
  (treesit-major-mode-setup))


;;;###autoload
(define-derived-mode phits-inp-ts-mode prog-mode "Phits INP"
  :group 'phits
  (when (treesit-ready-p 'phits)
	(setq-local treesit-primary-parser (treesit-parser-create 'phits))
	(phits-inp-ts-setup)))

(provide 'phits)
;;; phits.el ends here
