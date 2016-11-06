/*
 * pandoc-gui.gs
 *
 * # Legal disclaimer
 *
 * Copyright 2016 lc_addicted <>
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston,
 * MA 02110-1301, USA.
 *
 *
 * # Description
 *
 * This program is a front end to pandoc, it should offer all functionality
 * in a gui. The UX must be unintrusive, the chosen file must be shown in
 * the main window and a number of output options as well.
 *
 * Compile with:
 * valac pandoc-gui.gs -X -DGETTEXT_PACKAGE --pkg posix --pkg gtk+-3.0
 */

[indent=4]
uses Gtk

init
    Intl.setlocale()
    Gtk.init (ref args)

    var header = new Header ( "Pandoc GUI" )
    var body = new WorkingFile(  )
    var app = new AppWindow ( header,body )
    var document_selector = new DocumentFileSelector( app )
    var load_new_content_command = new Load( body, document_selector )
    var convert_command = new Convert (document_selector)

    header.add_item( new OpenButton( load_new_content_command ) )
    header.add_item( new ConvertButton ( convert_command ) )

    app.show_all ()
    Gtk.main ()

class Convert:Object implements Command

    _document_selector:DocumentFileSelector

    construct ( document_selector:DocumentFileSelector )
        _document_selector = document_selector

    def execute()

        var a = new ToPDF()
        a.convert.begin( _document_selector.whichFile(), "-o converted.pdf")

class Header:HeaderBar

    construct( title:string = "" )

        this.show_close_button = true
        this.set_title( title )

    def add_item( item:Widget )
        this.pack_start( item )

class WorkingFile:ScrolledWindow

    _label:Gtk.Label

    construct()

        _label = new Gtk.Label("Select a file for conversion")
        this.add( _label )

    def SetLabel(new_label:string)
        _label.set_label(new_label)

class AppWindow:Window

    construct( header:Header, body:WorkingFile )
        this.window_position = WindowPosition.CENTER
        this.set_default_size( 400, 400 )
        this.destroy.connect( Gtk.main_quit)
        this.set_titlebar(header)
        var box  = new Box (Gtk.Orientation.VERTICAL, 1)
        box.pack_start(body, true, true, 0)
        this.add(box)

interface Command:Object
    def abstract execute()

interface DocumentSelector:Object
    def abstract select():bool
    def abstract get_document():string

class DocumentFileSelector:Object implements DocumentSelector

    _parent:Window
    _uri:string = ""
    _filename:string = ""

    construct( parent:Window )
        _parent = parent

    def select():bool
        var dialog = new FileChooserDialog( "Open file",
                                        _parent,
                                        FileChooserAction.OPEN,
                                        dgettext( "gtk30", "_OK"),
                                        ResponseType.ACCEPT,
                                        dgettext( "gtk30", "_Cancel" ),
                                        ResponseType.CANCEL)

        selected:bool = false
        var response = dialog.run()
        case response
            when ResponseType.ACCEPT
                _filename = dialog.get_filename()
                _uri = dialog.get_uri()
                selected = true
        dialog.destroy()
        return selected

    def whichFile():string
        return _filename

    def get_document():string
        text : string
        len : size_t
        try
            FileUtils.get_contents (_filename, out text, out len)
        except ex : FileError
            print "%s\n", ex.message
        return text

class Load:Object implements Command

    _receiver:WorkingFile
    _document_selector:DocumentFileSelector

    construct( receiver:WorkingFile, document_selector:DocumentFileSelector )

        _document_selector = document_selector
        _receiver = receiver

    def execute()
        if _document_selector.select()
            print _document_selector.whichFile()
            _receiver.SetLabel(_document_selector.whichFile())

class OpenButton:ToolButton
    construct( command:Command )
        this.icon_widget = new Image.from_icon_name(
                                                 "document-open",
                                                 IconSize.SMALL_TOOLBAR
                                                 )
        this.clicked.connect( command.execute )

class ConvertButton:ToolButton
    construct( command:Command )
        this.icon_widget = new Image.from_icon_name(
                                                 "gtk-convert",
                                                 IconSize.SMALL_TOOLBAR
                                                 )
        this.clicked.connect( command.execute )

class ToPDF

    const _command:string = "pandoc"

    def async convert( source:string, output:string )
        try
            var flags = SubprocessFlags.STDOUT_PIPE \
                        | SubprocessFlags.STDERR_PIPE
            var subprocess = new Subprocess( flags,
                                             _command,
                                             source,
                                             output
                                            )
            output_buffer:Bytes
            yield subprocess.communicate_async( null,
                                                null,
                                                out output_buffer,
                                                null
                                               )
            if ( subprocess.get_exit_status() == 0 )
                debug( "command successful: \n %s",
                       (string)output_buffer.get_data()
                      )
            else
                debug( "command failed" )
        except err:Error
            debug( err.message )
