package main

import (
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"simulator/htmlbind"
	"sort"
	"strconv"
	"strings"
)

/**
 @author: lengyanhua
	create at 2021/11/27
*/

var extensionToContentType = map[string]string{
	".html": "text/html; charset=utf-8",
	".css":  "text/css; charset=utf-8",
	".js":   "application/javascript",
	".xml":  "text/xml; charset=utf-8",
	".jpg":  "image/jpeg",
	".svg":  "image/svg+xml",
	".png":  "image/png",
	".mp4":  "video/mp4",
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/static/", fileHandler)
	mux.HandleFunc("/", func(writer http.ResponseWriter, request *http.Request) {
		path := "./static/simulator.html"
		readPath(writer, request, path)
	})
	server := &http.Server{
		Addr:    ":80",
		Handler: mux,
	}
	println("*========================================*")
	println("|                                        |")
	println("| Start simulator service licensing 80.  |")
	println("| You can visit with Browser at:         |")
	println("|                   http://localhost     |")
	println("|                                        |")
	println("|         KEEP THIS WINDOW OPEN          |")
	println("|                                        |")
	println("*========================================*")

	if err := server.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}

func fileHandler(w http.ResponseWriter, r *http.Request) {
	path := "." + r.URL.Path
	readPath(w, r, path)
}

func readPath(w http.ResponseWriter, r *http.Request, path string) {
	//fmt.Println(path)
	if strings.HasPrefix(path, ".") {
		path = path[1:]
	}
	if strings.HasPrefix(path, "/") {
		path = path[1:]
	}
	bytes, err := htmlbind.Asset(path)
	if err != nil {
		Error(w, toHTTPError(err))
		return
	}
	ext := filepath.Ext(path)
	if contentType := extensionToContentType[ext]; contentType != "" {
		w.Header().Set("Content-Type", contentType)
		if ext == ".mp4" {
			w.Header().Set("Accept-Ranges", "bytes")
		}
	}

	w.Header().Set("Content-Length", strconv.Itoa(len(bytes)))
	w.Write(bytes)
	f, err := os.Open(path)
	if err != nil {
		Error(w, toHTTPError(err))
		return
	}
	defer f.Close()

	d, err := f.Stat()
	if err != nil {
		Error(w, toHTTPError(err))
		return
	}

	if d.IsDir() {
		DirList(w, r, f)
		return
	}

	/*data, err := ioutil.ReadAll(f)
	if err != nil {
		Error(w, toHTTPError(err))
		return
	}

	ext := filepath.Ext(path)
	if contentType := extensionToContentType[ext]; contentType != "" {
		w.Header().Set("Content-Type", contentType)
	}

	w.Header().Set("Content-Length", strconv.FormatInt(d.Size(), 10))
	w.Write(data)*/
}

func DirList(w http.ResponseWriter, r *http.Request, f http.File) {
	dirs, err := f.Readdir(-1)
	if err != nil {
		Error(w, http.StatusInternalServerError)
		return
	}
	sort.Slice(dirs, func(i, j int) bool { return dirs[i].Name() < dirs[j].Name() })

	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	fmt.Fprintf(w, "<pre>\n")
	for _, d := range dirs {
		name := d.Name()
		if d.IsDir() {
			name += "/"
		}
		url := url.URL{Path: name}
		fmt.Fprintf(w, "<a href=\"%s\">%s</a>\n", url.String(), name)
	}
	fmt.Fprintf(w, "</pre>\n")
}

func toHTTPError(err error) int {
	if os.IsNotExist(err) {
		return http.StatusNotFound
	}
	if os.IsPermission(err) {
		return http.StatusForbidden
	}
	return http.StatusInternalServerError
}

func Error(w http.ResponseWriter, code int) {
	w.WriteHeader(code)
}
