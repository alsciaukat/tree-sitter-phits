;; -*- lexical-binding: t; -*-

(defcustom phits-dir
  (cond ((eq system-type 'gnu/linux) "/opt/phits")
		((eq system-type 'windows-nt) "C:/phits"))
  "The root directory of phits installation."
  :type 'directory
  :group 'phits)

(defvar phits-inp-ts--section-padding 200)
(defvar-local phits-inp-ts--surface-index-list nil)
(defvar-local phits-inp-ts--cell-index-list nil)


(defun phits-inp-ts--get-surface-indices ()
  (let* ((root (treesit-buffer-root-node))
		 (section-body (treesit-search-subtree root "surface_section_body")))
	(seq-map (lambda (i) (string-to-number (treesit-node-text (cdr i) t)))
			 (treesit-query-capture section-body
									'((surface_definition
									   surface_number: (index) @index))))))

(defun phits-inp-ts--get-cell-indices ()
  (let* ((root (treesit-buffer-root-node))
		 (section-body (treesit-search-subtree root "cell_section_body")))
	(seq-map (lambda (i) (string-to-number (treesit-node-text (cdr i) t)))
			 (treesit-query-capture section-body
									'((cell_definition
									   cell_number: (index) @index))))))

(defun phits-inp-ts--update-surface-index-list (ranges parser)
  (when (eq parser treesit-primary-parser)
  (if (not ranges)
	  (setq-local phits-inp-ts--surface-index-list (phits-inp-ts--get-surface-indices))

	(let ((surface-section-body-range (phits-inp-ts--get-node-range "surface_section_body")))
	  (dolist (range ranges)
		(when (and (> (cdr range) (- (car surface-section-body-range) phits-inp-ts--section-padding))
				 (< (car range) (+ (cdr surface-section-body-range) phits-inp-ts--section-padding)))
			(setq-local phits-inp-ts--surface-index-list (phits-inp-ts--get-surface-indices))))))))

(defun phits-inp-ts--update-cell-index-list (ranges parser)
  (if (not (eq parser treesit-primary-parser)) (return))
  (if (not ranges)
	  (setq-local phits-inp-ts--cell-index-list (phits-inp-ts--get-cell-indices))

	(let ((cell-section-body-range (phits-inp-ts--get-node-range "cell_section_body")))
	  (dolist (range ranges)
		(if (and (> (cdr range) (- (car cell-section-body-range) phits-inp-ts--section-padding))
				 (< (car range) (+ (cdr cell-section-body-range) phits-inp-ts--section-padding)))
			(setq-local phits-inp-ts--cell-index-list (phits-inp-ts--get-cell-indices)))))))


(defun phits-inp-ts--get-node-range (type)
  (let* ((root (treesit-buffer-root-node))
		 (node (treesit-search-subtree root type)))
	`(,(treesit-node-start node) . ,(treesit-node-end node))))


(defun phits-inp-ts--fontify-cell-index (node override start end &rest _)
  (let ((index (string-to-number (treesit-node-text node t))))
	(if (< index 0) (setq index (- index)))
	(when (and (null (member index phits-inp-ts--surface-index-list))
			   (not (null (member index phits-inp-ts--cell-index-list))))
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
	  material_number: (index) @font-lock-property-name-face)
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
	(setq phits-inp-ts--surface-index-list (phits-inp-ts--get-surface-indices))
	(setq phits-inp-ts--cell-index-list (phits-inp-ts--get-cell-indices))
	(treesit-parser-add-notifier treesit-primary-parser #'phits-inp-ts--update-cell-index-list)
	(treesit-parser-add-notifier treesit-primary-parser #'phits-inp-ts--update-surface-index-list)
	(phits-inp-ts-setup)))

(provide 'phits)
;;; phits.el ends here
