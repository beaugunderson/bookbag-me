/*global wishlistId:true*/
$(function () {
  $.getJSON('http://api.usatoday.com/open/bestsellers/books/booklists' +
    '?api_key=mgkgv7frjxnrzbpmz9bfjq7t&encoding=json&count=5',
    function (books) {
    $('#loading-bestsellers').hide();

    books.BookLists[0].BookListEntries.forEach(function (book) {
      $('#bestsellers').append('<li>' +
        '<span class="name"><a href="http://amzn.com/' + book.ASIN +
          '?tag=bookbag-me-20">' + book.Title + '</a></span>, ' +
        '<span class="author">' + book.Author + '</span>' +
      '</li>');
    });
  });

  $.getJSON('http://beaugunderson.com/wishlister/?id=' + wishlistId,
    function (books) {
    $('#books').html('');

    books.forEach(function (book) {
      $('#books').append('<li>' +
        '<span class="name"><a href="' + book.link + '">' + book.name +
          '</a></span>, ' +
        '<span class="rating">' + book.rating + '</span>, ' +
        '<span class="added">' + book['date-added'] + '</span>' +
      '</li>');
    });
  });
});
