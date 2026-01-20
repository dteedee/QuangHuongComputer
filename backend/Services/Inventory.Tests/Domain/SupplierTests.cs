using FluentAssertions;
using InventoryModule.Domain;
using Xunit;

namespace Inventory.Tests.Domain;

public class SupplierTests
{
    [Fact]
    public void Constructor_WithValidData_CreatesSupplier()
    {
        // Arrange
        var name = "ABC Electronics";
        var contactPerson = "John Doe";
        var email = "john@abc.com";
        var phone = "0123456789";
        var address = "123 Main St";

        // Act
        var supplier = new Supplier(name, contactPerson, email, phone, address);

        // Assert
        supplier.Should().NotBeNull();
        supplier.Id.Should().NotBe(Guid.Empty);
        supplier.Name.Should().Be(name);
        supplier.ContactPerson.Should().Be(contactPerson);
        supplier.Email.Should().Be(email);
        supplier.Phone.Should().Be(phone);
        supplier.Address.Should().Be(address);
    }

    [Fact]
    public void UpdateDetails_WithValidData_UpdatesSupplier()
    {
        // Arrange
        var supplier = new Supplier("Old Name", "Old Contact", "old@email.com", "1111111111", "Old Address");
        var newName = "New Name";
        var newContactPerson = "New Contact";
        var newEmail = "new@email.com";
        var newPhone = "2222222222";
        var newAddress = "New Address";

        // Act
        supplier.UpdateDetails(newName, newContactPerson, newEmail, newPhone, newAddress);

        // Assert
        supplier.Name.Should().Be(newName);
        supplier.ContactPerson.Should().Be(newContactPerson);
        supplier.Email.Should().Be(newEmail);
        supplier.Phone.Should().Be(newPhone);
        supplier.Address.Should().Be(newAddress);
    }

    [Fact]
    public void Validate_WithValidData_ReturnsSuccess()
    {
        // Arrange
        var supplier = new Supplier(
            "ABC Electronics",
            "John Doe",
            "john@abc.com",
            "0123456789",
            "123 Main St"
        );

        // Act
        var result = supplier.Validate();

        // Assert
        result.IsValid.Should().BeTrue();
        result.Errors.Should().BeEmpty();
    }

    [Fact]
    public void Validate_WithEmptyName_ReturnsError()
    {
        // Arrange
        var supplier = new Supplier(
            "",
            "John Doe",
            "john@abc.com",
            "0123456789",
            "123 Main St"
        );

        // Act
        var result = supplier.Validate();

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainKey("Name");
        result.Errors["Name"].Should().Contain("Name is required");
    }

    [Fact]
    public void Validate_WithEmptyContactPerson_ReturnsError()
    {
        // Arrange
        var supplier = new Supplier(
            "ABC Electronics",
            "",
            "john@abc.com",
            "0123456789",
            "123 Main St"
        );

        // Act
        var result = supplier.Validate();

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainKey("ContactPerson");
        result.Errors["ContactPerson"].Should().Contain("Contact person is required");
    }

    [Fact]
    public void Validate_WithInvalidEmail_ReturnsError()
    {
        // Arrange
        var supplier = new Supplier(
            "ABC Electronics",
            "John Doe",
            "invalid-email",
            "0123456789",
            "123 Main St"
        );

        // Act
        var result = supplier.Validate();

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainKey("Email");
        result.Errors["Email"].Should().Contain("Invalid email format");
    }

    [Fact]
    public void Validate_WithEmptyEmail_ReturnsError()
    {
        // Arrange
        var supplier = new Supplier(
            "ABC Electronics",
            "John Doe",
            "",
            "0123456789",
            "123 Main St"
        );

        // Act
        var result = supplier.Validate();

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainKey("Email");
        result.Errors["Email"].Should().Contain("Invalid email format");
    }

    [Fact]
    public void Validate_WithInvalidPhone_ReturnsError()
    {
        // Arrange
        var supplier = new Supplier(
            "ABC Electronics",
            "John Doe",
            "john@abc.com",
            "abc",
            "123 Main St"
        );

        // Act
        var result = supplier.Validate();

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainKey("Phone");
        result.Errors["Phone"].Should().Contain("Invalid phone format");
    }

    [Fact]
    public void Validate_WithEmptyPhone_ReturnsError()
    {
        // Arrange
        var supplier = new Supplier(
            "ABC Electronics",
            "John Doe",
            "john@abc.com",
            "",
            "123 Main St"
        );

        // Act
        var result = supplier.Validate();

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainKey("Phone");
        result.Errors["Phone"].Should().Contain("Invalid phone format");
    }

    [Fact]
    public void Validate_WithEmptyAddress_ReturnsError()
    {
        // Arrange
        var supplier = new Supplier(
            "ABC Electronics",
            "John Doe",
            "john@abc.com",
            "0123456789",
            ""
        );

        // Act
        var result = supplier.Validate();

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainKey("Address");
        result.Errors["Address"].Should().Contain("Address is required");
    }

    [Fact]
    public void Validate_WithMultipleErrors_ReturnsAllErrors()
    {
        // Arrange
        var supplier = new Supplier(
            "",
            "",
            "invalid-email",
            "abc",
            ""
        );

        // Act
        var result = supplier.Validate();

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().HaveCount(5);
        result.Errors.Should().ContainKey("Name");
        result.Errors.Should().ContainKey("ContactPerson");
        result.Errors.Should().ContainKey("Email");
        result.Errors.Should().ContainKey("Phone");
        result.Errors.Should().ContainKey("Address");
    }

    [Theory]
    [InlineData("john@example.com")]
    [InlineData("john.doe@example.co.uk")]
    [InlineData("john+test@example.com")]
    public void Validate_WithValidEmails_ReturnsSuccess(string email)
    {
        // Arrange
        var supplier = new Supplier(
            "ABC Electronics",
            "John Doe",
            email,
            "0123456789",
            "123 Main St"
        );

        // Act
        var result = supplier.Validate();

        // Assert
        result.IsValid.Should().BeTrue();
    }

    [Theory]
    [InlineData("0123456789")]
    [InlineData("012-345-6789")]
    [InlineData("(012) 345-6789")]
    [InlineData("+84 123 456 789")]
    public void Validate_WithValidPhones_ReturnsSuccess(string phone)
    {
        // Arrange
        var supplier = new Supplier(
            "ABC Electronics",
            "John Doe",
            "john@abc.com",
            phone,
            "123 Main St"
        );

        // Act
        var result = supplier.Validate();

        // Assert
        result.IsValid.Should().BeTrue();
    }
}
