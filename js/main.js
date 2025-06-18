// Function to open the lightbox with the clicked image, title, and description
function openLightbox(imageSrc, title, description) {
    const lightbox = document.getElementById("lightbox");
    const lightboxImage = document.getElementById("lightboxImage");
    const lightboxTitle = document.getElementById("lightboxTitle");
    const lightboxDescription = document.getElementById("lightboxDescription");

    lightbox.style.display = "flex";
    lightboxImage.src = imageSrc;
    lightboxTitle.innerText = title;         // Set the title
    lightboxDescription.innerText = description; // Set the description
}

// Function to close the lightbox
function closeLightbox() {
    const lightbox = document.getElementById("lightbox");
    lightbox.style.display = "none";
}

// Close lightbox when clicking outside the content
document.getElementById("lightbox").addEventListener("click", function(event) {
    if (event.target === this) {
        closeLightbox();
    }
});

(function ($) {
    "use strict";

    // Spinner
    var spinner = function () {
        setTimeout(function () {
            if ($('#spinner').length > 0) {
                $('#spinner').removeClass('show');
            }
        }, 1);
    };
    spinner();
    
    
    // Initiate the wowjs
    new WOW().init();


    // Navbar on scrolling
    $(window).scroll(function () {
        if ($(this).scrollTop() > 300) {
            $('.navbar').fadeIn('slow').css('display', 'flex');
        } else {
            $('.navbar').fadeOut('slow').css('display', 'none');
        }
    });


    // Smooth scrolling on the navbar links
    $(".navbar-nav a").on('click', function (event) {
        if (this.hash !== "") {
            event.preventDefault();
            
            $('html, body').animate({
                scrollTop: $(this.hash).offset().top - 45
            }, 1500, 'easeInOutExpo');
            
            if ($(this).parents('.navbar-nav').length) {
                $('.navbar-nav .active').removeClass('active');
                $(this).closest('a').addClass('active');
            }
        }
    });
    
    
    // Back to top button
    $(window).scroll(function () {
        if ($(this).scrollTop() > 300) {
            $('.back-to-top').fadeIn('slow');
        } else {
            $('.back-to-top').fadeOut('slow');
        }
    });
    $('.back-to-top').click(function () {
        $('html, body').animate({scrollTop: 0}, 1500, 'easeInOutExpo');
        return false;
    });
    

    // Typed Initiate
    if ($('.typed-text-output').length == 1) {
        var typed_strings = $('.typed-text').text();
        var typed = new Typed('.typed-text-output', {
            strings: typed_strings.split(', '),
            typeSpeed: 100,
            backSpeed: 20,
            smartBackspace: false,
            loop: true
        });
    }



    // Facts counter
    $('[data-toggle="counter-up"]').counterUp({
        delay: 10,
        time: 2000
    });


    // Skills
    $('.skill').waypoint(function () {
        $('.progress .progress-bar').each(function () {
            $(this).css("width", $(this).attr("aria-valuenow") + '%');
        });
    }, {offset: '80%'});


    // Portfolio isotope and filter
    var portfolioIsotope = $('.portfolio-container').isotope({
        itemSelector: '.portfolio-item',
        layoutMode: 'fitRows'
    });
    $('#portfolio-flters li').on('click', function () {
        $("#portfolio-flters li").removeClass('active');
        $(this).addClass('active');

        portfolioIsotope.isotope({filter: $(this).data('filter')});
    });

    // View Mode Toggle for Portfolio
    var $portfolioContainer = $('.portfolio-container');
    var $btnGridView = $('#btn-grid-view');
    var $btnListView = $('#btn-list-view');

    // Function to apply view mode
    function applyViewMode(mode) {
        if (mode === 'list') {
            $portfolioContainer.addClass('list-view-active');
            $btnListView.addClass('active');
            $btnGridView.removeClass('active');
            localStorage.setItem('portfolioViewMode', 'list');
        } else { // Default to grid
            $portfolioContainer.removeClass('list-view-active');
            $btnGridView.addClass('active');
            $btnListView.removeClass('active');
            localStorage.setItem('portfolioViewMode', 'grid');
        }
        // Re-layout Isotope
        if (portfolioIsotope.data('isotope')) { // Check if isotope is initialized
            portfolioIsotope.isotope('layout');
        }
    }

    // Event Listeners for view toggle buttons
    $btnListView.on('click', function () {
        applyViewMode('list');
    });

    $btnGridView.on('click', function () {
        applyViewMode('grid');
    });

    // On page load, check for saved preference
    var preferredViewMode = localStorage.getItem('portfolioViewMode');
    if (preferredViewMode) {
        applyViewMode(preferredViewMode);
    } else {
        // If no preference, ensure grid is active by default (it should be, but good to be explicit)
        // and portfolioIsotope.isotope('layout') will be called by applyViewMode if needed.
        // applyViewMode('grid'); // This will set grid as default and call layout.
        // HTML defaults to grid, so only call layout if isotope is initialized.
        if (portfolioIsotope.data('isotope')) {
             portfolioIsotope.isotope('layout');
        }
    }


    // Testimonials carousel
    $(".testimonial-carousel").owlCarousel({
        autoplay: true,
        smartSpeed: 1000,
        items: 1,
        dots: true,
        loop: true,
    });

    
})(jQuery);


