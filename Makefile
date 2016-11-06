app:
	valac \
	pandoc-gui.gs \
	-X -DGETTEXT_PACKAGE \
	--pkg posix \
	--pkg gtk+-3.0 \
	-d /tmp \
	--output pandoc-gui
